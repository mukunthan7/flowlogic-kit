# Workflow Engine

A powerful TypeScript workflow engine for building complex automation workflows with conditional logic, templating, and custom operations.

## Installation

```bash
npm install flowlogic-kit
# or
yarn add flowlogic-kit
```

## Features

- **Conditional Logic**: Support for complex AND/OR/NOT conditions with 40+ built-in operators
- **Templating**: LiquidJS-powered template rendering for dynamic content
- **Custom Operations**: Extensible with custom action executors and condition operators  
- **Data Transformations**: Transform workflow data using templates
- **Execution Logging**: Detailed execution logs for debugging and monitoring
- **Delay Support**: Built-in delay functionality for timed operations
- **Cycle Detection**: Prevents infinite loops in workflow execution

## Quick Start

```typescript
import { runWorkflow, Workflow, WorkflowContext } from 'flowlogic-kit';

// Define a simple workflow
const workflow: Workflow = {
  initialNodeId: 'start',
  nodes: [
    { id: 'start', type: 'start' },
    {
      id: 'action1',
      type: 'action',
      operation: { type: 'log', message: 'Hello World' },
      templates: { greeting: 'Hello {{ name }}!' }
    },
    { id: 'end', type: 'end' }
  ],
  edges: [
    { source: 'start', target: 'action1' },
    { source: 'action1', target: 'end' }
  ]
};

// Set up context and executors
const context: WorkflowContext = { name: 'Alice' };
const options = {
  customExecutors: {
    log: async (operation, data, context) => {
      console.log(operation.message);
      return { logged: true };
    }
  }
};

// Run the workflow
const result = await runWorkflow(workflow, context, options);
console.log(result.data);
```

## Core Types

### Workflow

The main workflow definition structure:

```typescript
type Workflow = {
  initialNodeId: string;  // Starting node ID
  nodes: Node[];          // Array of workflow nodes
  edges: Edge[];          // Array of connections between nodes
};
```

### Nodes

Workflows consist of different node types:

#### Start/End Nodes
```typescript
{ id: string; type: 'start' | 'end' }
```

#### Action Nodes
```typescript
type ActionNode = {
  id: string;
  type: 'action';
  delay?: number;                                    // Delay in milliseconds
  templates?: Record<string, string>;                // Template definitions
  transformations?: { field: string; value: string }[]; // Data transformations
  operation: Operation;                              // Operation to execute
  conditions?: Condition[];                          // Pre-execution conditions
};
```

#### Condition Nodes
```typescript
{ 
  id: string; 
  type: 'condition'; 
  conditions: Condition[]; 
}
```

### Conditions

Support for complex conditional logic:

```typescript
type Condition =
  | { type: 'and' | 'or'; conditions: Condition[] }  // Logical grouping
  | { type: 'not'; condition: Condition }            // Negation
  | { type: string; field: string; operator: string; value?: any }; // Field comparison
```

### Edges

Define connections between nodes:

```typescript
type Edge = {
  source: string;           // Source node ID
  target: string;           // Target node ID
  condition?: string;       // Simple condition ('passed'/'failed')
  conditions?: Condition[]; // Complex conditions
};
```

## Built-in Operators

The engine includes 40+ built-in comparison operators:

### Basic Comparison
- `eq`: Equal to
- `neq`: Not equal to
- `gt`: Greater than
- `gte`: Greater than or equal
- `lt`: Less than
- `lte`: Less than or equal

### String Operations
- `contains`: Contains substring
- `notcontains`: Does not contain substring
- `startsWith`: Starts with string
- `endsWith`: Ends with string
- `ieq`: Case-insensitive equal
- `icontains`: Case-insensitive contains
- `regex`: Regular expression match
- `matches`: Alias for regex

### Array/Collection Operations
- `in`: Value is in array
- `nin`: Value is not in array
- `containsAll`: Contains all specified values
- `containsAny`: Contains any of specified values
- `arrayEqual`: Arrays are equal (order independent)

### Type Checking
- `type`: Check JavaScript type
- `nottype`: Check not JavaScript type
- `null`: Is null
- `notnull`: Is not null
- `defined`: Is defined (not undefined)
- `notdefined`: Is undefined
- `truthy`: Is truthy value
- `falsy`: Is falsy value

### String Content
- `empty`: Is empty string
- `notempty`: Is not empty string
- `isUpperCase`: Is uppercase
- `isLowerCase`: Is lowercase
- `isDate`: Matches ISO date format
- `isjson`: Is valid JSON string

### Length Operations
- `length`: Exact length
- `lengthgt`: Length greater than
- `lengthgte`: Length greater than or equal
- `lengthlt`: Length less than
- `lengthlte`: Length less than or equal

### Numeric Operations
- `between`: Number between range (inclusive)
- `notbetween`: Number not between range

### Object Operations
- `hasProperty`: Object has property
- `deepEqual`: Deep equality comparison
- `json`: Parse JSON and match object

### Boolean Operations
- `true`: Exactly true
- `false`: Exactly false

## Templating

Templates use LiquidJS syntax and have access to the full workflow context:

```typescript
const node: ActionNode = {
  id: 'template-example',
  type: 'action',
  templates: {
    message: 'Hello {{ user.name }}, you have {{ notifications | size }} notifications',
    timestamp: '{{ "now" | date: "%Y-%m-%d %H:%M:%S" }}'
  },
  operation: { type: 'send_email' }
};
```

### Context Access

Templates can access:
- All workflow context data
- `__getTemplate(nodeId, key)`: Get rendered template from another node
- `__getResult(nodeId)`: Get execution result from another node

## Data Transformations

Transform workflow data before action execution:

```typescript
const node: ActionNode = {
  id: 'transform-example',
  type: 'action',
  transformations: [
    { field: 'user.fullName', value: '{{ user.firstName }} {{ user.lastName }}' },
    { field: 'processedAt', value: '{{ "now" | date }}' }
  ],
  operation: { type: 'process_user' }
};
```

## Custom Executors

Extend the engine with custom action executors:

```typescript
const customExecutors = {
  sendEmail: async (operation, data, context) => {
    const { to, subject, body } = operation;
    // Send email logic here
    return { emailId: 'email_123', sent: true };
  },
  
  httpRequest: async (operation, data, context) => {
    const response = await fetch(operation.url, {
      method: operation.method || 'GET',
      headers: operation.headers,
      body: operation.body
    });
    return await response.json();
  }
};

await runWorkflow(workflow, context, { customExecutors });
```

## Custom Operators

Add custom condition operators:

```typescript
const customOperators = {
  isWeekend: (date: string) => {
    const day = new Date(date).getDay();
    return day === 0 || day === 6;
  },
  
  inTimeRange: (time: string, [start, end]: [string, string]) => {
    return time >= start && time <= end;
  }
};

await runWorkflow(workflow, context, { customOperators });
```

## Complex Example

```typescript
const complexWorkflow: Workflow = {
  initialNodeId: 'start',
  nodes: [
    { id: 'start', type: 'start' },
    
    // Check user status
    {
      id: 'check-user',
      type: 'condition',
      conditions: [
        { type: 'user-check', field: 'user.status', operator: 'eq', value: 'active' },
        { type: 'user-check', field: 'user.email', operator: 'notempty' }
      ]
    },
    
    // Send notification if user is active
    {
      id: 'send-notification',
      type: 'action',
      delay: 1000,
      templates: {
        subject: 'Welcome {{ user.name }}!',
        body: 'Thank you for joining us on {{ "now" | date: "%B %d, %Y" }}'
      },
      transformations: [
        { field: 'notification.timestamp', value: '{{ "now" | date }}' }
      ],
      operation: {
        type: 'sendEmail',
        to: '{{ user.email }}',
        priority: 'high'
      }
    },
    
    // Log inactive user
    {
      id: 'log-inactive',
      type: 'action',
      operation: {
        type: 'log',
        level: 'info',
        message: 'Inactive user: {{ user.email }}'
      }
    },
    
    { id: 'end', type: 'end' }
  ],
  
  edges: [
    { source: 'start', target: 'check-user' },
    { source: 'check-user', target: 'send-notification', condition: 'passed' },
    { source: 'check-user', target: 'log-inactive', condition: 'failed' },
    { source: 'send-notification', target: 'end' },
    { source: 'log-inactive', target: 'end' }
  ]
};
```

## Execution Results

The `runWorkflow` function returns detailed execution information:

```typescript
const result = await runWorkflow(workflow, context, options);

// Final workflow data (including transformations)
console.log(result.data);

// Detailed execution logs
result.logs.forEach(log => {
  console.log(`[${log.timestamp}] ${log.step}:`, log);
});
```

### Log Types

- `node_enter`: Entering a node
- `node_exit`: Exiting a node  
- `action_executed`: Action completed with results
- `error`: Execution error occurred
- `complete`: Workflow completed successfully

## Error Handling

The engine provides comprehensive error handling:

```typescript
try {
  const result = await runWorkflow(workflow, context, options);
} catch (error) {
  if (error.message.includes('Unknown executor')) {
    console.error('Missing executor for operation type');
  } else if (error.message.includes('Node not found')) {
    console.error('Invalid workflow structure');
  }
}
```

## Best Practices

1. **Node IDs**: Use descriptive, unique node IDs
2. **Error Handling**: Always provide executors for all operation types
3. **Conditions**: Keep conditions simple and readable
4. **Templates**: Use templates for dynamic content rather than string concatenation
5. **Logging**: Monitor execution logs for debugging and optimization
6. **Testing**: Test workflows with various data scenarios
7. **Performance**: Use delays sparingly and only when necessary

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests for any improvements.