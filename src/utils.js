shell = require('shelljs');
fs = require('fs');
yaml = require('js-yaml')
clc = require("cli-color");

function dockerRun(imageName, operationDirectory, workflowDirectory) {
  const volumeName = Date.now() + operationDirectory
  console.log("Preparing volume for operation...")
  shell.exec(`docker volume create ${volumeName}`)
  shell.exec(`docker create -v ${volumeName}:/data --name helper busybox`)
  shell.exec(`docker cp ${workflowDirectory}/${operationDirectory}/atrc_data/. helper:/data`)
  const commandString =
    `docker run \\
    -v ${volumeName}:/atrc_data \\
    --name ${volumeName}-container \\
    ${imageName}`
  console.log(`${clc.green(commandString)}`)

  shell.exec(commandString)
  shell.exec(`docker cp helper:/data/outputs/. ${workflowDirectory}/${operationDirectory}/atrc_data/outputs/`)
  console.log("Cleaning up after operation...")
  shell.exec(`docker stop ${volumeName}-container || true && docker rm ${volumeName}-container || true && docker rm helper && docker volume rm ${volumeName}`)
}

function writeFile(path, contents) {
  fs.writeFileSync(path, contents, (error) => {
    error && console.error(error)
  })
}

function writeParametersFile(parameters, operationDirectory) {
  inputParamsYaml = yaml.dump(parameters)
  console.log("Writing parameters file")
  writeFile(`./${operationDirectory}/atrc_data/parameters.yaml`, inputParamsYaml)
}

function makeOperationDirectories(operationIndex) {
  console.log("Making directories for operation")
  operationDirectory = `workflow_step_${operationIndex}`
  shell.mkdir(operationDirectory)
  shell.cd(operationDirectory)
  shell.mkdir('atrc_data')
  shell.mkdir('atrc_data/outputs')
  shell.mkdir('atrc_data/inputs')
  shell.cd('..')
  return operationDirectory
}

function getWorkflowOperations() {
  fileContents = fs.readFileSync(`workflow.yaml`, 'utf8');
  data = yaml.load(fileContents);
  return data.operations
}

function makeWorkflowDirectory() {
  testCaseDirectoryName = process.argv[2]
  workflowFile = `${testCaseDirectoryName}/workflow.yaml`
  // TODO add slash below
  workflowDirectory = `/runner_outputs/${new Date(Date.now()).toISOString().replace(/\D+/g, '').substring(4, 14)}`
  shell.mkdir(workflowDirectory)
  shell.cp('-R', `${testCaseDirectoryName}/initial_data/`, workflowDirectory)
  shell.cp(workflowFile, `${workflowDirectory}/`)
  shell.cd(workflowDirectory)
  return workflowDirectory
}

const copyInitialFile = (input_or_file) => {
  // copy data file from initial data directory
  sourcePath = `./initial_data/${input_or_file.filename}`
  destinationPath = `./${operationDirectory}/atrc_data/inputs/${input_or_file.filename}`
  shell.cp(sourcePath, destinationPath)
}

function buildParameters(inputs, outputs, operations, operationDirectory) {
  let inputParameters = {}
  inputs.forEach(input => {
    switch (input.method) {
      case 'value':
        // create data file from value
        destinationPath = `./${operationDirectory}/atrc_data/inputs/${input.name}.json`
        writeFile(destinationPath, input.value.toString())
        // update parameters
        inputParameters[input.name] = { type: 'value', value: input.value }
        break
      case 'operation_output':
        // get reference to earlier operation output
        ({ operation_index, output_index } = input)
        filename = operations[operation_index].outputs[output_index].filename
        // copy data file from operation output
        sourcePath = `./workflow_step_${operation_index}/atrc_data/outputs/${filename}`
        destinationPath = `./${operationDirectory}/atrc_data/inputs/${input.filename}`
        shell.cp(sourcePath, destinationPath)
        // update parameters
        inputParameters[input.name] = { type: 'path', path: `/atrc_data/inputs/${input.filename}` }
        break
      case 'initial_data':
        // copy data file from initial data directory
        copyInitialFile(input)
        // update parameters
        inputParameters[input.name] = { type: 'path', path: `/atrc_data/inputs/${input.filename}` }
        break
      case 'initial_data_multiple':
        // copy data files from initial data directory
        input.files.forEach(file => copyInitialFile(file))
        // update parameters
        paths = input.files.map(file => `/atrc_data/inputs/${file.filename}`)
        inputParameters[input.name] = { type: 'multiple_paths', path: paths }
        break
    }
  })
  let outputParameters = {}
  outputs.forEach(output => {
    ({ type, path, name, filename } = output)
    outputParameters[name] = { type, path: `/atrc_data/outputs/${filename}` }
  })
  return { inputs: inputParameters, outputs: outputParameters }
}

function performOperation(operation, operationDirectory, operationIndex, workflowDirectory) {
  console.log(`${clc.green(`\nRunning Workflow Operation ${operationIndex + 1}/${operations.length} with ${operation.tool_name}:`)}`)
  shell.cd(operationDirectory)
  dockerRun(operation.tool_name, operationDirectory, workflowDirectory)
  shell.cd('..')
}

function checkOutputs(parameters, operationDirectory, workflowDirectory) {
  return Object.keys(parameters.outputs).every(key => {
    expectedPath = `./${operationDirectory}${parameters.outputs[key].path}`
    outputFound = shell.test('-f', expectedPath)
    if (outputFound) {
      console.log(`${clc.green(`\nExpected output '${key}' was found at '.${workflowDirectory + expectedPath.substring(1)}.`)}`)
    } else {
      console.log(clc.red(`\nOperation failed:
      operation did not produce an expected output. The output named ${key} was expected to be written to ${expectedPath} but it was not found.`))
    }
    return outputFound
  })
}

exports.dockerRun = dockerRun
exports.writeFile = writeFile
exports.writeParametersFile = writeParametersFile
exports.makeOperationDirectories = makeOperationDirectories
exports.getWorkflowOperations = getWorkflowOperations
exports.makeWorkflowDirectory = makeWorkflowDirectory
exports.buildParameters = buildParameters
exports.performOperation = performOperation
exports.checkOutputs = checkOutputs
