import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";
import { err, ok } from "neverthrow";

// Convert exec to return a Promise instead of using callbacks
const execPromise = promisify(exec);

export const _runGitCommand2 = async (args: {
  command: string;
  cwd: string;
  stdinInput?: Buffer; // Use Buffer for binary data
}) => {
  const cwd = args.cwd;

  try {
    // Prepare the environment variables if necessary
    const envOptions = {};

    // Split the command into an array of arguments
    const gitCommandParts = args.command.split(" ");

    // Spawn the git process
    const gitProcess = spawn("git", gitCommandParts, {
      cwd,
      ...envOptions,
      stdio: args.stdinInput
        ? ["pipe", "pipe", "pipe"]
        : ["ignore", "pipe", "pipe"], // Set up stdin to allow piping binary data if needed
    });

    let stdout = "";
    let stderr = "";

    // Capture stdout and stderr
    gitProcess.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    gitProcess.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    // If we have stdin input, write the binary content
    if (args.stdinInput) {
      gitProcess.stdin?.write(args.stdinInput);
      gitProcess.stdin?.end();
    }

    // Wait for the process to finish
    return new Promise<string>((resolve, reject) => {
      gitProcess.on("close", (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Git command failed with code ${code}: ${stderr}`));
        }
      });
    });
  } catch (error) {
    throw new Error(`Error executing git command: ${(error as Error).message}`);
  }
};

// Utility function to execute git commands
export const _runGitCommand = async (args: {
  command: string;
  cwd: string;
  stdinInput?: string; // Optional input for stdin, needed for commands like 'mktree'
  env?: string;
}) => {
  try {
    const cwd = args.cwd;
    // Execute the git command
    const envShim = args.env ? ` ${args.env} ` : " ";
    const shellCommand = args.stdinInput
      ? `printf '${args.stdinInput}' |${envShim}git ${args.command}` // Don't trim - preserve exact content for correct hashing
      : `${envShim}git ${args.command}`;

    const { stdout } = await execPromise(shellCommand, {
      cwd,
      maxBuffer: 1024 * 1024 * 50, // Increase the buffer size to 50MB for large repositories
    });

    // Return the output
    return ok(stdout);
  } catch (e) {
    return err(e);
  }
};

/**
 * Run git command and return output as Buffer (for binary-safe parsing)
 */
export const _runGitCommandBuffer = async (args: {
  command: string;
  cwd: string;
  stdinInput?: string;
}) => {
  try {
    const cwd = args.cwd;
    const gitCommandParts = args.command.split(" ");

    return new Promise<ReturnType<typeof ok<Buffer>>>((resolve, reject) => {
      const gitProcess = spawn("git", gitCommandParts, {
        cwd,
        stdio: ["pipe", "pipe", "pipe"],
      });

      const chunks: Buffer[] = [];
      let stderr = "";

      gitProcess.stdout?.on("data", (data: Buffer) => {
        chunks.push(data);
      });

      gitProcess.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      // Write stdin input if provided
      if (args.stdinInput) {
        gitProcess.stdin?.write(args.stdinInput);
        gitProcess.stdin?.end();
      } else {
        gitProcess.stdin?.end();
      }

      gitProcess.on("close", (code) => {
        if (code === 0) {
          resolve(ok(Buffer.concat(chunks)));
        } else {
          reject(new Error(`Git command failed with code ${code}: ${stderr}`));
        }
      });

      gitProcess.on("error", (error) => {
        reject(error);
      });
    });
  } catch (e) {
    return err(e);
  }
};
