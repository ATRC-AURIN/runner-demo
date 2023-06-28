# ATRC Runner Demonstration

Welcome to the Runner Demonstration repository for the [Australian Transport Research Cloud](https://aurin.org.au/about-aurin/projects/atrc/) project. The project involves multiple partners who have developed a range of tools relating to transportation data, analysis and simulation. The 'Workflow Runner' component of the project is a tool that runs these various tools in a consistent way, either individually or combined into multi-tool workflows.

This repo allows you to use your own machine to run a lightweight version of the Workflow Runner on a range of operating systems, using [a publicly available selection of the tools](#available-tools) built in the project.

Each of the tools in the project have been containerised and configured to recieve parameters in a consistent way, and the images that are public are accessible in a Harbor Docker registry at `registry.rc.nectar.org.au/atrc-core`

## Requirements

> This is a command line application that you'll need some familiarity with the terminal in order to run.

You'll also need **Docker** installed on your machine. If you haven't used Docker before, the easiest way to do this is by installing **Docker Desktop**, which is available to download for [macOS](https://docs.docker.com/desktop/install/mac-install/), [Windows](https://docs.docker.com/desktop/install/windows-install/), or [Linux](https://docs.docker.com/desktop/install/linux-install/) – follow the instructions for your operating system to download and install Docker Desktop, and have it launched and runing before completing the next steps.

Once you have Docker installed, copy this repository onto your machine (you can use the green `< > Code ▼ ` button above for some options here), and then you should be able to write and run workflows locally following the steps below.

## Running a workflow

Each available tool has an example workflow. You can see these examples as folders in the root of this project.

To run one of these examples (or a workflow you've set up yourself), just run this command in the terminal, from the root of the proejct:

```
./run_workflow.sh name-of-example-workflow-folder
```

So, to run the PopulationSynthesiser example, you'd run:

```
./run_workflow.sh population-synthesiser-example
```

You should see output appear in the terminal, either logging any errors encountered, or reporting that expected outputs were found.

Where expected outputs are sucessfully found, you'll see a message like:

```
Expected output 'POPULATION' was found at './runner_outputs/atrc_data/outputs/population.csv'
```

This will give you the path to find the workflow's output data in your filesystem.

## Writing your own workflows

The Workflow Runner needs two things two run:

- a folder with all the input data that you want to provide to the tool (or tools) in your workflow
- a valid `workflow.yaml` file - this tells the Runner what tools to use, what to provide the tool for inputs, and what to expect as outputs for each tool

To create and run your own workflow:

1. Create a folder in the root of this repository, for example `my-workflow`
2. Create a folder within that called `initial_data`. Copy any files you'd like to use in your workflow here.
3. Create a `workflow.yaml` file inside your workflow directory, for example `my-workflow/workflow.yaml`

> You may want to copy the `workflow.yaml` from the example folder of the tool you are trying to run.

4. Run the bash script in the root of this repository along with the name of your workflow folder, for example `./run_workflow.sh  my-workflow`
5. You should see the tool being run. Any expected outputs will be checked, and if they're found, you'll see their location within the `runner_outputs` directory in your terminal.

## Workflow files in depth

> In a future implementation of an analytics service that builds on this runner, `workflow.yaml` files will be able to be written automatically - using a combination of a 'schema' that describes each tool's possible inputs and outputs, and user input through a user interface. For now, these files are written manually.

Workflow files are [YAML files](https://docs.ansible.com/ansible/latest/reference_appendices/YAMLSyntax.html), which contain a list of `operations`. Each `operation` has a `tool_name`, which is the name of the Docker image of the tool that will run that operation, and a list of `inputs` and a list of expected `outputs`.

Each of the `inputs` has a `name` and a `method`, and some other fields depending on the method used. The `method` - which tells the Runner how to get the input - can have the following values:

- `initial_data` with this method, the Runner will get the input as a file from the folder of initial data. With this method you'll also need to provide the `filename` of the file in that folder.
- `initial_data_multiple` similar to initial data, but for tool parameters that require multiple files. With this method, instead of providing `filename` you provide `files`, which is a list of filenames in this initial data folder.
- `value` with this method, the Runner takes the value right from the workflow file itself. When the `method` is `value`, you must also provide a field called `value`, this is a string or integer you want to provide as the value itself.
- `operation_output` this method is only used in multi-tool workflows. This allows you to specify an output from one operation should be used as an input to another operation. Here you'll need to provide the `operation_index` (what number operation you're getting the output from) and the `output_index` (for that operation's outputs, what output was it).

The `outputs` section for each operation is optional, but including an output will allow the Runner to check for the presence of this data after running the tool. Outputs have a `name`, and a `filename` where the Runner will check for the data.

A simple workflow.yaml for a workflow that uses a hypothetical 'Adder Subtracter' tool might look like this:

```yml
operations:
  - tool_name: registry.rc.nectar.org.au/atrc-core/adder-subtracter
    inputs:
      - method: initial_data
        name: INPUT_1
        filename: input_one.json
      - method: initial_data
        name: INPUT_2
        filename: input_two.json
      - method: value
        name: OPERAND
        value: add
    outputs:
      - name: RESULT
        filename: result.json
```

## Available tools

### [rCITI](https://www.rciti.unsw.edu.au/) PopulationSynthesiser

Synthetic populations are crucial inputs for agent-based microsimulation models. This tool offers functions for creating create synthetic populations using data from the Australian Bureau of Statistics. To generate a synthetic population, a reference sample and population margins are required.

> To use this tool, set the `tool name` for the relevant operation in your `workflow.yaml` to:

```
registry.rc.nectar.org.au/atrc-core/populationsynthesiser
```

The repository where you can find out more about this tool is here: [github.com/ATRC-AURIN/PopulationSynthesiser](https://github.com/ATRC-AURIN/PopulationSynthesiser)

## Licensing

The Runner code itself is licensed under a [GPL-3.0 license](./LICENSE). For each tool, refer to the tool repository linked above for licensing information specific to that tool.
