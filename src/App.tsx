import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { Form } from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import Ajv from 'ajv';
import { Typography, Chip, Box, Button, Paper, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import './App.css';
import { 
  simpleUserSchema, 
  nestedObjectSchema, 
  schemaWithReferences, 
  schemaWithCompositions,
  complexSchema,
  recursiveSchema,
  mutualRecursionSchema,
  linkedListSchema,
  RecursiveList,
  IndirectAB,
  UiLayoutSchema,
  ProductSchema,
  ComplexComposedSchema,
  DeepIndirectABC,
  GraphQLTypeSchema
} from './utils/schemaExamples';
import { 
  checkForRecursionWithPath 
} from './utils/schemaUtils';
import { findLineNumberForPath } from './utils/lineUtils';

function App() {
  const [schemaInput, setSchemaInput] = useState('');
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; message: string } | null>(null);
  const [hasRecursion, setHasRecursion] = useState<boolean | null>(null);
  const [recursionPath, setRecursionPath] = useState<string | null>(null);
  const [recursionLineNumber, setRecursionLineNumber] = useState<number | null>(null);
  const [generatedForm, setGeneratedForm] = useState<React.ReactNode | null>(null);
  const [isSchemaLoading, setIsSchemaLoading] = useState(false);
  const [selectedSchema, setSelectedSchema] = useState('');
  const validationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle URL parameters and load schema on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const schemaParam = urlParams.get('schema');
    
    if (schemaParam) {
      loadExampleSchema(schemaParam);
    } else {
      // Load default schema (simple user schema)
      loadExampleSchema('simple');
    }
  }, []);

  // Update URL when selected schema changes
  useEffect(() => {
    if (selectedSchema) {
      const url = new URL(window.location.href);
      url.searchParams.set('schema', selectedSchema);
      window.history.replaceState({}, '', url.toString());
    }
  }, [selectedSchema]);

  // Apply or remove recursion line highlighting when recursion line number changes
  useEffect(() => {
    // Get the editor instance
    const editor = (window as any).currentEditor;
    if (!editor) return;
    
    // Clean up existing decorations
    if ((editor as any)._recursionDecorations) {
      editor.deltaDecorations((editor as any)._recursionDecorations, []);
      (editor as any)._recursionDecorations = [];
    }

    // Apply new decorations if recursion line number exists
    if (recursionLineNumber) {
      // Scroll to the line
      editor.revealLineInCenter(recursionLineNumber);
      
      // Apply decorations
      const newDecorations = editor.deltaDecorations([], [
        {
          range: new (window as any).monaco.Range(
            recursionLineNumber,
            1,
            recursionLineNumber,
            1000 // Large column number to highlight the entire line
          ),
          options: {
            isWholeLine: true,
            className: 'recursion-highlight',
            glyphMarginClassName: 'recursion-glyph',
            overviewRuler: {
              color: 'rgba(244, 67, 54, 0.5)',
              position: 1 // OverviewRulerLane.Full
            }
          }
        }
      ]);
      
      // Store decoration IDs for cleanup
      (editor as any)._recursionDecorations = newDecorations;
    }
  }, [recursionLineNumber, schemaInput]);

  // Automatic validation with 500ms delay
  useEffect(() => {
    // Clear previous timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Set new timeout
    if (schemaInput.trim() !== '') {
      validationTimeoutRef.current = setTimeout(() => {
        validateSchema();
      }, 500);
    } else {
      setValidationResult(null);
      setGeneratedForm(null);
      setHasRecursion(null);
    }

    // Cleanup timeout on unmount
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [schemaInput]);

  // Automatically generate form when schema is valid and has no recursion
  useEffect(() => {
    if (validationResult?.isValid && hasRecursion === false) {
      generateForm();
    } else if (hasRecursion === true) {
      // Clear the generated form when recursion is detected
      setGeneratedForm(null);
    }
  }, [validationResult, hasRecursion]);

  const validateSchema = async () => {
    try {
      // Parse the JSON schema
      const schema = JSON.parse(schemaInput);
      
      // Check for recursion
      const { hasRecursion, recursionPath } = checkForRecursionWithPath(schema);
      setHasRecursion(hasRecursion);
      setRecursionPath(recursionPath);
      
      // Find line number for recursion if path exists
      if (hasRecursion && recursionPath) {
        // Use the improved function to find the first element of the recursion path
        const lineNumber = findLineNumberForPath(schemaInput, recursionPath);
        setRecursionLineNumber(lineNumber);
      } else {
        setRecursionLineNumber(null);
      }
      
      // Clear generated form if recursion is detected
      if (hasRecursion) {
        setGeneratedForm(null);
      }
      
      // Create AJV instance
      const ajv = new Ajv();
      
      // Validate the schema itself
      const isValid = ajv.validateSchema(schema);
      
      if (isValid) {
        setValidationResult({
          isValid: true,
          message: 'JSON Schema is valid!'
        });
      } else {
        setValidationResult({
          isValid: false,
          message: `Invalid JSON Schema: ${ajv.errorsText()}`
        });
      }
    } catch (error) {
      setValidationResult({
        isValid: false,
        message: `Invalid JSON: ${(error as Error).message}`
      });
      setHasRecursion(null);
      setRecursionPath(null);
      setRecursionLineNumber(null);
      setGeneratedForm(null);
    }
  };

  const generateForm = () => {
    try {
      // Parse the JSON schema
      const schema = JSON.parse(schemaInput);
      
      // Check if schema is valid first
      const ajv = new Ajv();
      const isValid = ajv.validateSchema(schema);
      
      if (!isValid) {
        setValidationResult({
          isValid: false,
          message: 'Cannot generate form: Invalid JSON Schema'
        });
        return;
      }
      
      // Generate form using @rjsf with Material UI theme
      setGeneratedForm(
        <div className="generated-form" style={{ 
          padding: '24px', 
          backgroundColor: '#fafafa', 
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
          border: '1px solid #e0e0e0'
        }}>
          <Typography variant="h5" gutterBottom align="center" style={{ 
            color: '#333',
            marginBottom: '20px',
            fontWeight: 500
          }}>
            Generated Form
          </Typography>
          <Form 
            schema={schema}
            validator={validator}
            uiSchema={{}}
            formData={{}}
          >
            <Box mt={3} display="flex" justifyContent="center">
              <Button 
                variant="contained" 
                color="primary" 
                type="submit"
                size="large"
                style={{ 
                  padding: '10px 30px',
                  fontSize: '16px',
                  fontWeight: 500
                }}
              >
                Submit Form
              </Button>
            </Box>
          </Form>
        </div>
      );
    } catch (error) {
      setValidationResult({
        isValid: false,
        message: `Error generating form: ${(error as Error).message}`
      });
    }
  };

  // Load example schema
  const loadExampleSchema = (schemaName: string) => {
    const schemas: Record<string, any> = {
      empty: {}, // Empty schema
      simple: simpleUserSchema,
      nested: nestedObjectSchema,
      references: schemaWithReferences,
      compositions: schemaWithCompositions,
      complex: complexSchema,
      recursive: recursiveSchema,
      mutualRecursion: mutualRecursionSchema,
      linkedList: linkedListSchema,
      recursiveList: RecursiveList,
      indirectAB: IndirectAB,
      uiLayout: UiLayoutSchema,
      product: ProductSchema,
      complexComposed: ComplexComposedSchema,
      deepIndirect: DeepIndirectABC,
      graphQL: GraphQLTypeSchema
    };
    
    const selectedSchema = schemas[schemaName];
    if (selectedSchema) {
      setIsSchemaLoading(true);
      setTimeout(() => {
        setSchemaInput(JSON.stringify(selectedSchema, null, 2));
        setSelectedSchema(schemaName);
        setIsSchemaLoading(false);
        // Clear recursion line number when loading a new schema
        setRecursionLineNumber(null);
      }, 200);
    }
  };
  
  return (
    <div className="app">
      <Typography variant="h4" gutterBottom align="center">
        JSON Schema Validator & Form Generator
      </Typography>
      <Box display="flex" gap={2} mb={2}>
        <Chip 
          icon={<div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: schemaInput.trim() === '' ? '#9e9e9e' : 
                           validationResult?.isValid ? '#4caf50' : '#f44336',
            margin: '0 8px'
          }} />}
          label={
            schemaInput.trim() === '' ? "Validation" : 
            validationResult?.isValid ? "Validation" : "Validation"
          }
          variant="outlined"
          size="small"
        />
        <Chip 
          icon={<div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: schemaInput.trim() === '' ? '#9e9e9e' : 
                           hasRecursion === true ? '#f44336' : 
                           hasRecursion === false ? '#4caf50' : '#9e9e9e',
            margin: '0 8px'
          }} />}
          label={
            schemaInput.trim() === '' ? "Recursion" : 
            hasRecursion === true ? "Recursion" : 
            hasRecursion === false ? "Recursion" : "Recursion"
          }
          variant="outlined"
          size="small"
        />
      </Box>
      <div className="grid-container">
        <div className="grid-item" style={{ marginRight: '24px' }}>
          <Box display="flex" flexDirection="column" gap={2}>
            <Paper elevation={2} className="editor-container" style={{ 
                height: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {isSchemaLoading ? (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    fontSize: '16px',
                    color: '#666'
                  }}>
                    <div className="spinner" style={{
                      width: '20px',
                      height: '20px',
                      border: '2px solid #f3f3f3',
                      borderTop: '2px solid #1976d2',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <style>
                      {`
                        @keyframes spin {
                          0% { transform: rotate(0deg); }
                          100% { transform: rotate(360deg); }
                        }
                      `}
                    </style>
                    Loading schema...
                  </div>
                ) : (
                  <Editor
                    height="400px"
                    language="json"
                    theme="vs-light"
                    value={schemaInput}
                    onChange={(value) => {
                      setSchemaInput(value || '');
                      // Clear recursion line number when user manually edits the schema
                      setRecursionLineNumber(null);
                    }}
                    onMount={(editor) => {
                      // Store editor instance for later use
                      (window as any).currentEditor = editor;
                      
                      // Highlight the recursion line if it exists
                      if (recursionLineNumber) {
                        // Scroll to the line
                        editor.revealLineInCenter(recursionLineNumber);
                        
                        // Apply decorations
                        const newDecorations = editor.deltaDecorations([], [
                          {
                            range: new (window as any).monaco.Range(
                              recursionLineNumber,
                              1,
                              recursionLineNumber,
                              1000 // Large column number to highlight the entire line
                            ),
                            options: {
                              isWholeLine: true,
                              className: 'recursion-highlight',
                              glyphMarginClassName: 'recursion-glyph',
                              overviewRuler: {
                                color: 'rgba(244, 67, 54, 0.5)',
                                position: 1 // OverviewRulerLane.Full
                              }
                            }
                          }
                        ]);
                        
                        // Store decoration IDs for cleanup
                        (editor as any)._recursionDecorations = newDecorations;
                      }
                    }}
                    options={{
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      glyphMargin: true, // Enable glyph margin for markers
                      lineNumbers: 'on',
                      folding: true,
                      fontSize: 14,
                      tabSize: 2,
                      wordWrap: 'on'
                    }}
                  />
                )}
              </Paper>
            <Box sx={{ width: '340px' }}>
              <FormControl fullWidth>
                <InputLabel id="schema-select-label">Select Example Schema</InputLabel>
                <Select
                  labelId="schema-select-label"
                  id="schema-select"
                  value={selectedSchema}
                  label="Select Example Schema"
                  onChange={(e) => {
                    if (e.target.value) {
                      loadExampleSchema(e.target.value as string);
                    }
                  }}
                >
                  <MenuItem value="empty">Empty Schema</MenuItem>
                  <MenuItem value="simple">Simple User Schema</MenuItem>
                  <MenuItem value="nested">Nested Object Schema</MenuItem>
                  <MenuItem value="references">Schema with References</MenuItem>
                  <MenuItem value="compositions">Schema with Compositions</MenuItem>
                  <MenuItem value="complex">Complex Schema</MenuItem>
                  <MenuItem value="recursive">Recursive Schema</MenuItem>
                  <MenuItem value="mutualRecursion">Mutual Recursion Schema</MenuItem>
                  <MenuItem value="linkedList">Linked List Schema</MenuItem>
                  <MenuItem value="recursiveList">Recursive List</MenuItem>
                  <MenuItem value="indirectAB">Indirect A-B Recursion</MenuItem>
                  <MenuItem value="uiLayout">UI Layout Schema</MenuItem>
                  <MenuItem value="product">Product Schema</MenuItem>
                  <MenuItem value="complexComposed">Complex Composed Schema</MenuItem>
                  <MenuItem value="deepIndirect">Deep Indirect ABC Recursion</MenuItem>
                  <MenuItem value="graphQL">GraphQL Type Schema</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </div>
        <div className="grid-item">
          <Box display="flex" flexDirection="column" gap={2}>
            {generatedForm ? (
              generatedForm
            ) : hasRecursion === true ? (
              <Paper className="form-placeholder" elevation={1} style={{ 
                padding: '24px', 
                backgroundColor: '#fafafa', 
                borderRadius: '8px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
                border: '1px solid #e0e0e0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Typography variant="h5" gutterBottom style={{ 
                  color: '#f44336',
                  marginBottom: '16px',
                  fontWeight: 500
                }}>
                  Recursion Detected
                </Typography>
                <Typography variant="body1" color="textSecondary" align="center" style={{ 
                  maxWidth: '80%',
                  lineHeight: 1.6,
                  marginBottom: '16px'
                }}>
                  This schema contains recursion and cannot be used to generate a form.
                  Please modify the schema to remove recursive references.
                </Typography>
                {recursionPath && (
                  <div style={{ 
                    backgroundColor: '#ffebee', 
                    border: '1px solid #f44336', 
                    borderRadius: '4px', 
                    padding: '12px', 
                    marginTop: '16px',
                    width: '100%',
                    maxWidth: '80%'
                  }}>
                    <Typography variant="subtitle2" style={{ 
                      color: '#f44336', 
                      marginBottom: '8px',
                      fontWeight: 600
                    }}>
                      Recursion Path:
                    </Typography>
                    <Typography variant="body2" style={{ 
                      fontFamily: 'monospace', 
                      fontSize: '14px',
                      wordBreak: 'break-all'
                    }}>
                      {recursionPath}
                    </Typography>
                  </div>
                )}
              </Paper>
            ) : (
              <Paper className="form-placeholder" elevation={1} style={{ 
                padding: '24px', 
                backgroundColor: '#fafafa', 
                borderRadius: '8px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
                border: '1px solid #e0e0e0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Typography variant="h5" gutterBottom style={{ 
                  color: '#666',
                  marginBottom: '16px',
                  fontWeight: 500
                }}>
                  Form Preview
                </Typography>
                <Typography variant="body1" color="textSecondary" align="center" style={{ 
                  maxWidth: '80%',
                  lineHeight: 1.6
                }}>
                  Form will be automatically displayed when a valid schema without recursion is entered.
                </Typography>
              </Paper>
            )}
          </Box>
        </div>
      </div>
    </div>
  );
}

export default App;