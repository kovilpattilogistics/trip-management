// Reference to vite/client removed to resolve "Cannot find type definition file" error.

// Augment the NodeJS namespace to include API_KEY in ProcessEnv.
// This avoids redeclaring 'process' which causes conflicts with existing types (e.g. from @types/node).
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    [key: string]: string | undefined;
  }
}
