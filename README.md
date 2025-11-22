# JSON Schema Validator

A simple React application that allows you to validate JSON schemas using AJV (Another JSON Schema Validator).

## Features

- Paste any JSON schema into the text area
- Click "Validate Schema" to check if the schema is valid
- Get immediate feedback on whether the schema is valid or invalid
- Clear error messages for invalid schemas

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Open your browser to http://localhost:5173

## Building for Production

To create a production build:
```
npm run build
```

To preview the production build:
```
npm run preview
```

## Dependencies

- React + TypeScript + Vite
- Ant Design (UI Components)
- AJV (JSON Schema Validator)