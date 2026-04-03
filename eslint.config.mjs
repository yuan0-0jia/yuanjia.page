import nextPlugin from "@next/eslint-plugin-next";

export default [
  {
    ignores: ["_next/**", "node_modules/**", ".next/**"],
  },
  nextPlugin.configs["core-web-vitals"],
];
