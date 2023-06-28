({
  writeParametersFile,
  makeOperationDirectories,
  getWorkflowOperations,
  makeWorkflowDirectory,
  buildParameters,
  performOperation,
  checkOutputs
} = require('./utils'))

function performOperations(operations, workflowDirectory) {
  operations.every((operation, operationIndex) => {
    // Creates a directory and data subfolders for the operation
    operationDirectory = makeOperationDirectories(operationIndex)

    // Places needed files into the data directory and tracks these parameters
    parameters = buildParameters(operation.inputs, operation.outputs, operations, operationDirectory)

    // Saves this parameters record as inputs.yaml
    writeParametersFile(parameters, operationDirectory)

    // Runs the tool
    performOperation(operation, operationDirectory, operationIndex, workflowDirectory)

    // Checks the required outputs have been created
    expectedOutputsPresent = checkOutputs(parameters, operationDirectory, workflowDirectory)

    // Exit with failure code if output not present
    if (!expectedOutputsPresent) {
      console.log(clc.red('Exiting due to missing output'))
      process.exit(1)
    }

    // Stops running operations if expected outputs missing
    return !!expectedOutputsPresent
  })
}

// Workflow Runner entrypoint ⬇
workflowDirectory = makeWorkflowDirectory() // Creates a timestamped directory for the Workflow Run
operations = getWorkflowOperations() // Reads the operations from the Workflow file
performOperations(operations, workflowDirectory) // Executes each of the operations in order