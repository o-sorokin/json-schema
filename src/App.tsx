import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { Form } from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import Ajv from 'ajv';
import { Typography, Chip, Box, Button, Paper, Select, MenuItem, FormControl, InputLabel, IconButton, List, ButtonBase, Checkbox, Tabs, Tab } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
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
import { findLineNumberForPath, findAllLineNumbersForPath } from './utils/lineUtils';
import { findCircularRefs } from './utils/cycleRefs';

function App() {
  const [schemaInput, setSchemaInput] = useState('');
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; message: string } | null>(null);
  const [hasRecursion, setHasRecursion] = useState<boolean | null>(null);
  const [recursionPath, setRecursionPath] = useState<string | null>(null);
  const [recursionLineNumber, setRecursionLineNumber] = useState<number | null>(null);
  const [generatedForm, setGeneratedForm] = useState<React.ReactNode | null>(null);
  const [isSchemaLoading, setIsSchemaLoading] = useState(false);
  const [selectedSchema, setSelectedSchema] = useState('');
  const [uploadedSchemas, setUploadedSchemas] = useState<Array<{name: string; content: string; isValid: boolean; hasCircularRefs: boolean; validationMessage: string}>>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Handle drag and drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    const newSchemas: Array<{name: string; content: string; isValid: boolean; hasCircularRefs: boolean; validationMessage: string}> = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        try {
          const content = await file.text();
          // Validate that it's a valid JSON
          const parsedSchema = JSON.parse(content);
          
          // Check for circular references (detailed analysis)
          let hasCircularRefs = false;
          try {
            findCircularRefs(parsedSchema);
          } catch (error) {
            hasCircularRefs = true;
          }
          
          // Validate with AJV
          const ajv = new Ajv();
          const isValid: boolean = ajv.validateSchema(parsedSchema) as boolean;
          const validationMessage = isValid ? 'Valid JSON Schema' : `Invalid: ${ajv.errorsText()}`;
          
          newSchemas.push({
            name: file.name,
            content: content,
            isValid: isValid,
            hasCircularRefs: hasCircularRefs,
            validationMessage: validationMessage
          });
        } catch (error) {
          alert(`Error reading file ${file.name}: ${(error as Error).message}`);
        }
      } else {
        alert(`File ${file.name} is not a valid JSON file`);
      }
    }
    
    if (newSchemas.length > 0) {
      setUploadedSchemas(prev => [...prev, ...newSchemas]);
      // Load the first uploaded schema
      if (uploadedSchemas.length === 0 && newSchemas.length > 0) {
        loadUploadedSchema(newSchemas[0].content, newSchemas[0].name);
      }
    }
  };

  const loadUploadedSchema = (content: string, name: string) => {
    setIsSchemaLoading(true);
    setTimeout(() => {
      setSchemaInput(content);
      setSelectedSchema(name);
      setIsSchemaLoading(false);
      setRecursionLineNumber(null);
      
      // Also update validation results for the loaded schema
      try {
        const parsedSchema = JSON.parse(content);
        const { hasRecursion, recursionPath } = checkForRecursionWithPath(parsedSchema);
        setHasRecursion(hasRecursion);
        setRecursionPath(recursionPath);
        
        const ajv = new Ajv();
        const isValid: boolean = ajv.validateSchema(parsedSchema) as boolean;
        setValidationResult({
          isValid: isValid,
          message: isValid ? 'JSON Schema is valid!' : `Invalid JSON Schema: ${ajv.errorsText()}`
        });
        
        // Clear generated form if recursion detected
        if (hasRecursion) {
          setGeneratedForm(null);
        }
      } catch (error) {
        setValidationResult({
          isValid: false,
          message: `Invalid JSON: ${(error as Error).message}`
        });
        setHasRecursion(null);
        setRecursionPath(null);
        setGeneratedForm(null);
      }
    }, 200);
  };

  const removeUploadedSchema = (index: number) => {
    const newSchemas = [...uploadedSchemas];
    const removedSchema = newSchemas.splice(index, 1)[0];
    
    setUploadedSchemas(newSchemas);
    
    // Remove from selected files
    const newSelectedFiles = new Set(selectedFiles);
    newSelectedFiles.delete(index);
    // Adjust indices of selected files after deletion
    const adjustedSelectedFiles = new Set<number>();
    newSelectedFiles.forEach(selectedIndex => {
      if (selectedIndex > index) {
        adjustedSelectedFiles.add(selectedIndex - 1);
      } else if (selectedIndex < index) {
        adjustedSelectedFiles.add(selectedIndex);
      }
    });
    setSelectedFiles(adjustedSelectedFiles);
    
    // If the removed schema was the currently selected one, load another one
    if (selectedSchema === removedSchema.name) {
      if (newSchemas.length > 0) {
        loadUploadedSchema(newSchemas[0].content, newSchemas[0].name);
      } else {
        // Load default schema
        loadExampleSchema('simple');
      }
    }
  };

  // Toggle selection of a single file
  const toggleFileSelection = (index: number) => {
    const newSelectedFiles = new Set(selectedFiles);
    if (newSelectedFiles.has(index)) {
      newSelectedFiles.delete(index);
    } else {
      newSelectedFiles.add(index);
    }
    setSelectedFiles(newSelectedFiles);
  };

  // Select all files
  const selectAllFiles = () => {
    if (selectedFiles.size === uploadedSchemas.length) {
      // If all are selected, deselect all
      setSelectedFiles(new Set());
    } else {
      // Select all files
      const allIndices = new Set<number>();
      uploadedSchemas.forEach((_, index) => allIndices.add(index));
      setSelectedFiles(allIndices);
    }
  };

  // Delete selected files
  const deleteSelectedFiles = () => {
    if (selectedFiles.size === 0) return;
    
    const sortedIndices = Array.from(selectedFiles).sort((a, b) => b - a); // Sort descending
    let newSchemas = [...uploadedSchemas];
    let needToLoadNewSchema = false;
    
    // Remove files starting from highest index to avoid index shifting issues
    for (const index of sortedIndices) {
      const removedSchema = newSchemas.splice(index, 1)[0];
      if (removedSchema.name === selectedSchema) {
        needToLoadNewSchema = true;
      }
    }
    
    setUploadedSchemas(newSchemas);
    setSelectedFiles(new Set());
    
    // Load a new schema if the current one was deleted
    if (needToLoadNewSchema) {
      if (newSchemas.length > 0) {
        loadUploadedSchema(newSchemas[0].content, newSchemas[0].name);
      } else {
        loadExampleSchema('simple');
      }
    }
  };

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
      findCircularRefs(JSON.parse(schemaInput));
    } catch (e) {
      console.error(e);
    }

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
  
  // Render recursion path as clickable links
  const renderRecursionPathLinks = (path: string) => {
    if (!path) return null;
    
    const pathParts = path.split(' -> ');
    
    // Find line numbers for all parts of the path
    const lineNumbers = findAllLineNumbersForPath(schemaInput, path);
    
    return pathParts.map((part, index) => (
      <span key={index}>
        <a 
          href="#" 
          onClick={(e) => {
            e.preventDefault();
            // Find line number for this part of the path
            const lineNumber = lineNumbers[index];
            if (lineNumber && (window as any).currentEditor) {
              const editor = (window as any).currentEditor;
              // Scroll to the line
              editor.revealLineInCenter(lineNumber);
              
              // Remove previous decorations if they exist
              if ((editor as any)._pathDecorations) {
                editor.deltaDecorations((editor as any)._pathDecorations, []);
              }
              
              // Apply temporary decoration to highlight the line
              const newDecorations = editor.deltaDecorations([], [
                {
                  range: new (window as any).monaco.Range(
                    lineNumber,
                    1,
                    lineNumber,
                    1000 // Large column number to highlight the entire line
                  ),
                  options: {
                    isWholeLine: true,
                    className: 'recursion-highlight-all',
                    glyphMarginClassName: 'recursion-glyph-all'
                  }
                }
              ]);
              
              // Store decoration IDs for cleanup
              (editor as any)._pathDecorations = newDecorations;
              
              // Remove the decoration after 3 seconds
              setTimeout(() => {
                if ((editor as any)._pathDecorations) {
                  editor.deltaDecorations((editor as any)._pathDecorations, []);
                  (editor as any)._pathDecorations = [];
                }
              }, 3000);
            }
          }}
          style={{
            color: '#1976d2',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontWeight: lineNumbers[index] ? 'bold' : 'normal'
          }}
        >
          {part}
        </a>
        {index < pathParts.length - 1 && ' -> '}
      </span>
    ));
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
            
            {/* Tabs Section */}
            <Paper elevation={2}>
              <Tabs 
                value={activeTab} 
                onChange={(_, newValue) => setActiveTab(newValue)}
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
              >
                <Tab label="Example Schemas" />
                <Tab label={`Uploaded Files (${uploadedSchemas.length})`} />
              </Tabs>
            </Paper>
            
            {activeTab === 0 ? (
              // Example Schemas Tab
              <Paper elevation={1} style={{ padding: '24px' }}>
                <Box sx={{ width: '100%' }}>
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
              </Paper>
            ) : (
              // Uploaded Files Tab
              <Paper elevation={1} style={{ padding: '24px' }}>
                {/* Upload Section */}
                <Box mb={3}>
                  <Typography variant="subtitle2" gutterBottom>
                    Upload JSON Schemas
                  </Typography>
                  
                  {/* Drag and Drop Zone */}
                  <Paper 
                    variant="outlined"
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      borderStyle: dragActive ? 'dashed' : 'solid',
                      borderColor: dragActive ? 'primary.main' : 'grey.300',
                      backgroundColor: dragActive ? 'primary.light' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        borderColor: 'primary.main',
                        backgroundColor: 'grey.50'
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="body2">
                      Drag & drop JSON files here or click to browse
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Supports multiple files
                    </Typography>
                  </Paper>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    multiple
                    onChange={handleFileInput}
                    style={{ display: 'none' }}
                  />
                </Box>
                
                {/* Uploaded Schemas List */}
                {uploadedSchemas.length > 0 && (
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        Uploaded Schemas ({uploadedSchemas.length})
                      </Typography>
                      <Box display="flex" gap={1}>
                        <IconButton 
                          size="small" 
                          onClick={selectAllFiles}
                          title={selectedFiles.size === uploadedSchemas.length ? "Deselect all" : "Select all"}
                          sx={{ 
                            border: '1px solid',
                            borderColor: 'divider',
                            '&:hover': {
                              backgroundColor: 'action.hover'
                            }
                          }}
                        >
                          <SelectAllIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={deleteSelectedFiles}
                          disabled={selectedFiles.size === 0}
                          color={selectedFiles.size > 0 ? "error" : "inherit"}
                          title="Delete selected"
                          sx={{ 
                            border: '1px solid',
                            borderColor: selectedFiles.size > 0 ? 'error.main' : 'divider',
                            '&:hover': {
                              backgroundColor: selectedFiles.size > 0 ? 'error.light' : 'action.hover'
                            },
                            '&.Mui-disabled': {
                              borderColor: 'divider'
                            }
                          }}
                        >
                          <DeleteSweepIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        overflow: 'hidden'
                      }}
                    >
                      <List disablePadding>
                        {uploadedSchemas.map((schema, index) => (
                          <React.Fragment key={index}>
                            <ButtonBase
                              sx={{
                                width: '100%',
                                textAlign: 'left',
                                p: 2,
                                transition: 'all 0.2s ease',
                                borderBottom: index < uploadedSchemas.length - 1 ? '1px solid' : 'none',
                                borderBottomColor: 'divider',
                                '&:hover': {
                                  backgroundColor: 'action.hover'
                                },
                                '&:last-child': {
                                  borderBottom: 'none'
                                },
                                ...(selectedSchema === schema.name && {
                                  backgroundColor: 'primary.light',
                                  borderLeft: '3px solid',
                                  borderLeftColor: 'primary.main'
                                }),
                                ...(selectedFiles.has(index) && {
                                  backgroundColor: 'secondary.light'
                                })
                              }}
                              onClick={() => {
                                if (selectedFiles.size > 0) {
                                  toggleFileSelection(index);
                                } else {
                                  loadUploadedSchema(schema.content, schema.name);
                                }
                              }}
                            >
                              <Box display="flex" alignItems="flex-start" width="100%">
                                <Checkbox
                                  checked={selectedFiles.has(index)}
                                  onChange={() => toggleFileSelection(index)}
                                  onClick={(e) => e.stopPropagation()}
                                  size="small"
                                  sx={{ 
                                    mt: 0.5,
                                    '&.Mui-checked': {
                                      color: 'secondary.main'
                                    }
                                  }}
                                />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                    <DescriptionIcon 
                                      sx={{ 
                                        fontSize: 20, 
                                        color: selectedSchema === schema.name ? 'primary.main' : 'action.active'
                                      }} 
                                    />
                                    <Typography 
                                      variant="body2" 
                                      sx={{ 
                                        fontWeight: selectedSchema === schema.name ? 600 : 500,
                                        color: 'text.primary',
                                        flex: 1,
                                        minWidth: 0
                                      }}
                                      noWrap
                                    >
                                      {schema.name}
                                    </Typography>
                                    <Box display="flex" gap={0.5}>
                                      <Chip 
                                        size="small"
                                        label={schema.isValid ? "Valid" : "Invalid"}
                                        color={schema.isValid ? "success" : "error"}
                                        variant="filled"
                                        sx={{ 
                                          height: 20,
                                          '& .MuiChip-label': {
                                            px: 0.5,
                                            fontSize: '0.65rem'
                                          }
                                        }}
                                      />
                                      <Chip 
                                        size="small"
                                        label={
                                          schema.hasCircularRefs ? "↻ Circular" : 
                                          "Linear"
                                        }
                                        color={
                                          schema.hasCircularRefs ? "error" : 
                                          "success"
                                        }
                                        variant="filled"
                                        sx={{ 
                                          height: 20,
                                          '& .MuiChip-label': {
                                            px: 0.5,
                                            fontSize: '0.65rem'
                                          }
                                        }}
                                      />
                                    </Box>
                                  </Box>
                                  
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Typography 
                                      variant="caption" 
                                      color="text.secondary"
                                      sx={{ 
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5
                                      }}
                                    >
                                      <span>{schema.content.length.toLocaleString()} chars</span>
                                    </Typography>
                                    
                                    {!schema.isValid && (
                                      <Typography 
                                        variant="caption" 
                                        color="error" 
                                        sx={{ 
                                          fontStyle: 'italic',
                                          maxWidth: '60%',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        {schema.validationMessage}
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                                
                                <IconButton 
                                  edge="end" 
                                  aria-label="delete"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeUploadedSchema(index);
                                  }}
                                  size="small"
                                  sx={{ 
                                    ml: 1,
                                    color: 'text.secondary',
                                    '&:hover': {
                                      color: 'error.main',
                                      backgroundColor: 'error.light'
                                    }
                                  }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            </ButtonBase>
                          </React.Fragment>
                        ))}
                      </List>
                    </Paper>
                  </Box>
                )}
                
                {uploadedSchemas.length === 0 && (
                  <Typography variant="body2" color="text.secondary" align="center" py={4}>
                    No files uploaded yet. Drag & drop JSON files above.
                  </Typography>
                )}
              </Paper>
            )}
          </Box>
        </div>
        
        {/* Form Column */}
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
                justifyContent: 'center',
                minHeight: '400px'
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
                    <div style={{ 
                      fontFamily: 'monospace', 
                      fontSize: '14px',
                      wordBreak: 'break-all'
                    }}>
                      {renderRecursionPathLinks(recursionPath)}
                    </div>
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
                justifyContent: 'center',
                minHeight: '400px'
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