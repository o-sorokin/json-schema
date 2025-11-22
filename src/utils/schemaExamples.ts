/**
 * Collection of example JSON schemas for testing and demonstration purposes
 */

// Simple user schema example
export const simpleUserSchema = {
  type: 'object',
  title: 'User Information',
  properties: {
    name: {
      type: 'string',
      title: 'Name',
      description: 'Enter your full name'
    },
    age: {
      type: 'integer',
      title: 'Age',
      description: 'Enter your age',
      minimum: 0,
      maximum: 120
    },
    email: {
      type: 'string',
      title: 'Email',
      format: 'email',
      description: 'Enter your email address'
    }
  },
  required: ['name', 'age']
};

// Schema with nested objects
export const nestedObjectSchema = {
  type: 'object',
  title: 'Company Information',
  properties: {
    companyName: {
      type: 'string',
      title: 'Company Name'
    },
    address: {
      type: 'object',
      title: 'Address',
      properties: {
        street: {
          type: 'string',
          title: 'Street'
        },
        city: {
          type: 'string',
          title: 'City'
        },
        zipCode: {
          type: 'string',
          title: 'Zip Code'
        },
        country: {
          type: 'string',
          title: 'Country'
        }
      },
      required: ['street', 'city']
    },
    employees: {
      type: 'array',
      title: 'Employees',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            title: 'Employee Name'
          },
          position: {
            type: 'string',
            title: 'Position'
          }
        },
        required: ['name']
      }
    }
  },
  required: ['companyName']
};

// Schema with references
export const schemaWithReferences = {
  type: 'object',
  title: 'Product Catalog',
  definitions: {
    price: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          title: 'Amount'
        },
        currency: {
          type: 'string',
          title: 'Currency',
          enum: ['USD', 'EUR', 'GBP']
        }
      },
      required: ['amount', 'currency']
    },
    product: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: 'Product Name'
        },
        price: {
          $ref: '#/definitions/price'
        },
        category: {
          type: 'string',
          title: 'Category'
        }
      },
      required: ['name', 'price']
    }
  },
  properties: {
    catalogName: {
      type: 'string',
      title: 'Catalog Name'
    },
    products: {
      type: 'array',
      title: 'Products',
      items: {
        $ref: '#/definitions/product'
      }
    }
  },
  required: ['catalogName', 'products']
};

// Schema with recursion (for testing recursion detection)
export const recursiveSchema = {
  type: 'object',
  title: 'Recursive Category',
  properties: {
    name: {
      type: 'string',
      title: 'Category Name'
    },
    subcategories: {
      type: 'array',
      title: 'Subcategories',
      items: {
        $ref: '#'  // Self-reference
      }
    }
  }
};

// Schema with allOf, anyOf, oneOf
export const schemaWithCompositions = {
  type: 'object',
  title: 'Contact Information',
  properties: {
    contactType: {
      type: 'string',
      title: 'Contact Type',
      enum: ['person', 'company']
    },
    name: {
      type: 'string',
      title: 'Name'
    }
  },
  allOf: [
    {
      if: {
        properties: {
          contactType: {
            const: 'person'
          }
        }
      },
      then: {
        properties: {
          lastName: {
            type: 'string',
            title: 'Last Name'
          },
          dateOfBirth: {
            type: 'string',
            title: 'Date of Birth',
            format: 'date'
          }
        },
        required: ['lastName']
      }
    },
    {
      if: {
        properties: {
          contactType: {
            const: 'company'
          }
        }
      },
      then: {
        properties: {
          companyName: {
            type: 'string',
            title: 'Company Name'
          },
          vatNumber: {
            type: 'string',
            title: 'VAT Number'
          }
        },
        required: ['companyName']
      }
    }
  ],
  required: ['contactType', 'name']
};

// Complex schema with various data types
export const complexSchema = {
  type: 'object',
  title: 'Employee Profile',
  properties: {
    personalInfo: {
      type: 'object',
      title: 'Personal Information',
      properties: {
        firstName: {
          type: 'string',
          title: 'First Name'
        },
        lastName: {
          type: 'string',
          title: 'Last Name'
        },
        dateOfBirth: {
          type: 'string',
          title: 'Date of Birth',
          format: 'date'
        },
        nationality: {
          type: 'string',
          title: 'Nationality'
        }
      },
      required: ['firstName', 'lastName']
    },
    employment: {
      type: 'object',
      title: 'Employment Details',
      properties: {
        employeeId: {
          type: 'integer',
          title: 'Employee ID'
        },
        department: {
          type: 'string',
          title: 'Department'
        },
        position: {
          type: 'string',
          title: 'Position'
        },
        salary: {
          type: 'number',
          title: 'Salary'
        },
        startDate: {
          type: 'string',
          title: 'Start Date',
          format: 'date'
        },
        isManager: {
          type: 'boolean',
          title: 'Is Manager'
        }
      },
      required: ['employeeId', 'department', 'position']
    },
    skills: {
      type: 'array',
      title: 'Skills',
      items: {
        type: 'string'
      }
    },
    contact: {
      type: 'object',
      title: 'Contact Information',
      properties: {
        email: {
          type: 'string',
          title: 'Email',
          format: 'email'
        },
        phone: {
          type: 'string',
          title: 'Phone Number'
        },
        address: {
          type: 'object',
          title: 'Address',
          properties: {
            street: {
              type: 'string',
              title: 'Street'
            },
            city: {
              type: 'string',
              title: 'City'
            },
            state: {
              type: 'string',
              title: 'State'
            },
            zipCode: {
              type: 'string',
              title: 'Zip Code'
            }
          }
        }
      }
    }
  },
  required: ['personalInfo', 'employment']
};

export const mutualRecursionSchema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "Mutual recursion A ↔ B",
    "type": "object",
    "properties": {
        "b": { "$ref": "#/$defs/B" }
    },
    "$defs": {
        "B": {
            "type": "object",
            "properties": {
                "a": { "$ref": "#/$defs/A" }
            }
        },
        "A": {
            "type": "object",
            "properties": {
                "b": { "$ref": "#/$defs/B" }
            }
        }
    }
}

export const linkedListSchema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "Linked List Node",
    "type": "object",
    "properties": {
        "value": { "type": "string" },
        "next": { "$ref": "#" }
    },
    "additionalProperties": false
}

// Простая прямая рекурсия (дерево / linked list)
export const RecursiveList = {
    "$id": "RecursiveList",
    "type": "object",
    "properties": {
        "id": { "type": "string" },
        "next": { "$ref": "#" }
    },
    "required": ["id"]
}

// Косвенная рекурсия через $defs (A → B → A)
export const IndirectAB = {
    "$id": "IndirectAB",
    "$defs": {
        "A": {
            "type": "object",
            "properties": {
                "b": { "$ref": "#/$defs/B" }
            }
        },
        "B": {
            "type": "object",
            "properties": {
                "a": { "$ref": "#/$defs/A" }
            }
        }
    },
    "$ref": "#/$defs/A"
}

// Реалистичная схема UI-формы с частичной рекурсией внутри layout
export const UiLayoutSchema = {
    "$id": "UiLayoutSchema",
    "type": "object",
    "properties": {
        "type": { "type": "string" },
        "title": { "type": "string" },
        "children": {
            "type": "array",
            "items": { "$ref": "#/$defs/Node" }
        }
    },
    "$defs": {
        "Node": {
            "type": "object",
            "properties": {
                "component": { "type": "string" },
                "props": { "type": "object" },
                "layout": {
                    "type": "object",
                    "properties": {
                        "children": {
                            "type": "array",
                            "items": { "$ref": "#/$defs/Node" }
                        }
                    }
                }
            }
        }
    }
}

// Сложная e-commerce схема (Product), рекурсия в category hierarchy
export const ProductSchema = {
    "$id": "ProductSchema",
    "type": "object",
    "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "category": { "$ref": "#/$defs/Category" }
    },
    "$defs": {
        "Category": {
            "type": "object",
            "properties": {
                "id": { "type": "string" },
                "title": { "type": "string" },
                "parent": { "$ref": "#/$defs/Category" }
            }
        }
    }
}

// Схема с композициями allOf/oneOf и вложенными рекурсивными структурами
export const ComplexComposedSchema = {
    "$id": "ComplexComposedSchema",
    "type": "object",
    "allOf": [
        { "$ref": "#/$defs/Base" },
        { "$ref": "#/$defs/Extended" }
    ],
    "$defs": {
        "Base": {
            "type": "object",
            "properties": {
                "id": { "type": "string" },
                "meta": { "$ref": "#/$defs/Meta" }
            }
        },
        "Extended": {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": { "$ref": "#/$defs/Node" }
                }
            }
        },
        "Meta": {
            "type": "object",
            "properties": {
                "parent": { "$ref": "#/$defs/Meta" }
            }
        },
        "Node": {
            "type": "object",
            "properties": {
                "children": {
                    "type": "array",
                    "items": { "$ref": "#/$defs/Node" }
                }
            }
        }
    }
}

// Глубокая косвенная рекурсия: A → B → C → A
export const DeepIndirectABC = {
    "$id": "DeepIndirectABC",
    "$defs": {
        "A": { "$ref": "#/$defs/B" },
        "B": { "$ref": "#/$defs/C" },
        "C": { "$ref": "#/$defs/A" }
    },
    "$ref": "#/$defs/A"
}

// JSON Schema для GraphQL-подобной модели
export const GraphQLTypeSchema = {
    "$id": "GraphQLTypeSchema",
    "type": "object",
    "properties": {
        "name": { "type": "string" },
        "fields": {
            "type": "array",
            "items": { "$ref": "#/$defs/Field" }
        }
    },
    "$defs": {
        "Field": {
            "type": "object",
            "properties": {
                "name": { "type": "string" },
                "type": {
                    "oneOf": [
                        { "type": "string" },
                        { "$ref": "#/$defs/GraphQLType" }
                    ]
                }
            }
        },
        "GraphQLType": {
            "type": "object",
            "properties": {
                "name": { "type": "string" },
                "fields": {
                    "type": "array",
                    "items": { "$ref": "#/$defs/Field" }
                }
            }
        }
    }
}
