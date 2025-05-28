import * as _ from 'lodash-es';
import { Liquid } from 'liquidjs';

const engine = new Liquid();

export type Condition =
    | { type: 'and' | 'or'; conditions: Condition[] }
    | { type: 'not'; condition: Condition }
    | { type: string; field: string; operator: string; value?: any };

export type Operation = {
    type: string;
    [key: string]: any;
};

type OperatorFunction =
    | ((a: any, b: any) => boolean)
    | ((a: any) => boolean)
    | ((a: any, b: [any, any]) => boolean);

type BinaryOperator<T = any, U = any> = (a: T, b: U) => boolean;
type UnaryOperator<T = any> = (a: T) => boolean;
type BetweenOperator<T = any> = (a: T, b: [T, T]) => boolean;

type OperatorsMap = {
    eq: BinaryOperator;
    neq: BinaryOperator;
    gt: BinaryOperator;
    gte: BinaryOperator;
    lt: BinaryOperator;
    lte: BinaryOperator;
    contains: BinaryOperator;
    in: BinaryOperator;
    nin: BinaryOperator;
    regex: BinaryOperator<string>;
    true: UnaryOperator<boolean>;
    false: UnaryOperator<boolean>;
    null: UnaryOperator;
    notnull: UnaryOperator;
    empty: UnaryOperator<string>;
    notempty: UnaryOperator<string>;
    defined: UnaryOperator;
    notdefined: UnaryOperator;
    type: BinaryOperator<any, string>;
    nottype: BinaryOperator<any, string>;
    startsWith: BinaryOperator<string>;
    endsWith: BinaryOperator<string>;
    deepEqual: BinaryOperator;
    notcontains: BinaryOperator;
    length: BinaryOperator<{ length: number }, number>;
    lengthgt: BinaryOperator<{ length: number }, number>;
    lengthgte: BinaryOperator<{ length: number }, number>;
    lengthlt: BinaryOperator<{ length: number }, number>;
    lengthlte: BinaryOperator<{ length: number }, number>;
    matches: BinaryOperator<string>;
    json: BinaryOperator<string, object>;
    between: BetweenOperator<number>;
    notbetween: BetweenOperator<number>;
    ieq: BinaryOperator<string>;
    icontains: BinaryOperator<string>;
    isjson: UnaryOperator<string>;
    truthy: UnaryOperator;
    falsy: UnaryOperator;
    containsAll: BinaryOperator<any[] | string, any[]>;
    containsAny: BinaryOperator<any[] | string, any[]>;
    hasProperty: BinaryOperator<object, string>;
    arrayEqual: BinaryOperator<any[], any[]>;
    isDate: UnaryOperator<string>;
    isUpperCase: UnaryOperator<string>;
    isLowerCase: UnaryOperator<string>;
    [key: string]: OperatorFunction;
};

export type Operators = keyof OperatorsMap;

export type ActionNode = {
    id: string;
    type: 'action';
    delay?: number;
    templates?: Record<string, string>;
    transformations?: { field: string; value: string }[];
    operation: Operation;
    conditions?: Condition[];
};

export type Node =
    | { id: string; type: 'start' | 'end' }
    | ActionNode
    | { id: string; type: 'condition'; conditions: Condition[] };

export type Edge = {
    source: string;
    target: string;
    condition?: string;
    conditions?: Condition[];
};

export type Workflow = {
    initialNodeId: string;
    nodes: Node[];
    edges: Edge[];
};

export type WorkflowContext = Record<string, any>;

export type ActionExecutor = (operation: Operation, data: any, context: WorkflowContext) => Promise<any>;
export type ConditionOperator = (a: any, b?: any) => boolean;

export interface WorkflowEngineOptions {
    customExecutors?: Record<string, ActionExecutor>;
    customOperators?: Record<string, ConditionOperator>;
}

export async function runWorkflow(
    workflow: Workflow,
    context: WorkflowContext,
    options: WorkflowEngineOptions = {}
) {
    const nodeMap = new Map(workflow.nodes.map((node) => [node.id, node]));
    const edges = workflow.edges || [];
    const data = _.cloneDeep(context);
    data.__templates = {};
    data.__actionResults = {};
    data.__getTemplate = (nodeId: string, key: string) => data.__templates?.[nodeId]?.[key];
    data.__getResult = (nodeId: string) => data.__actionResults?.[nodeId];

    const logs: any[] = [];

    const conditionOperators: OperatorsMap = {
        eq: (a, b) => a === b,
        neq: (a, b) => a !== b,
        gt: (a, b) => a > b,
        gte: (a, b) => a >= b,
        lt: (a, b) => a < b,
        lte: (a, b) => a <= b,
        contains: (a, b) => _.includes(a, b),
        in: (a, b) => _.includes(b, a),
        nin: (a, b) => !_.includes(b, a),
        regex: (a, b) => new RegExp(b).test(a),
        true: (a) => a === true,
        false: (a) => a === false,
        null: (a) => a === null,
        notnull: (a) => a !== null,
        empty: (a) => a === '',
        notempty: (a) => a !== '',
        defined: (a) => a !== undefined,
        notdefined: (a) => a === undefined,
        type: (a, b) => typeof a === b,
        nottype: (a, b) => typeof a !== b,
        startsWith: (a, b) => _.startsWith(a, b),
        endsWith: (a, b) => _.endsWith(a, b),
        deepEqual: (a, b) => _.isEqual(a, b),
        notcontains: (a, b) => !_.includes(a, b),
        length: (a, b) => a?.length === b,
        lengthgt: (a, b) => a?.length > b,
        lengthgte: (a, b) => a?.length >= b,
        lengthlt: (a, b) => a?.length < b,
        lengthlte: (a, b) => a?.length <= b,
        matches: (a, b) => new RegExp(b).test(a),
        json: (a, b) => {
            try {
                const obj = JSON.parse(a);
                return _.isMatch(obj, b);
            } catch {
                return false;
            }
        },
        between: (a: number, [min, max]: [number, number]) => a >= min && a <= max,
        notbetween: (a: number, [min, max]: [number, number]) => a < min || a > max,
        ieq: (a: string, b: string) => String(a).toLowerCase() === String(b).toLowerCase(),
        icontains: (a: string, b: string) => String(a).toLowerCase().includes(String(b).toLowerCase()),
        isjson: (a: string) => {
            try {
                JSON.parse(a);
                return true;
            } catch {
                return false;
            }
        },
        truthy: (a: any) => !!a,
        falsy: (a: any) => !a,
        containsAll: (a: any[] | string, b: any[]) => b.every(el => a.includes(el)),
        containsAny: (a: any[] | string, b: any[]) => b.some(el => a.includes(el)),
        hasProperty: (a: object, b: string) => Object.prototype.hasOwnProperty.call(a, b),
        arrayEqual: (a: any[], b: any[]) => {
            if (!Array.isArray(a) || !Array.isArray(b)) return false;
            return a.length === b.length && a.every(el => b.includes(el));
        },
        isDate: (a: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(a),
        isUpperCase: (a: string) => a === a.toUpperCase(),
        isLowerCase: (a: string) => a === a.toLowerCase(),
        ...options.customOperators,
    };

    const executors: Record<string, ActionExecutor> = {
        ...options.customExecutors,
    };

    async function checkConditions(conditions: Condition[]): Promise<boolean> {
        for (const condition of conditions) {
            if (!(await evaluateAnyCondition(condition))) return false;
        }
        return true;
    }

    async function evaluateAnyCondition(condition: Condition): Promise<boolean> {
        if ('conditions' in condition) {
            if (condition.type === 'and') return (await Promise.all(condition.conditions.map(evaluateAnyCondition))).every(Boolean);
            if (condition.type === 'or') return (await Promise.all(condition.conditions.map(evaluateAnyCondition))).some(Boolean);
        }
        if (condition.type === 'not' && 'condition' in condition) return !(await evaluateAnyCondition(condition.condition));
        if ('field' in condition && 'operator' in condition) {
            const value = _.get(data, condition.field);
            const fn = conditionOperators[condition.operator];
            return fn ? fn(value, condition.value) : false;
        }
        return false;
    }

    async function applyTransformations(transformations: { field: string; value: string }[]) {
        for (const t of transformations) {
            const rendered = await engine.parseAndRender(t.value, data);
            _.set(data, t.field, rendered);
        }
    }

    async function renderTemplates(templates: Record<string, string>) {
        const rendered: Record<string, string> = {};
        for (const [key, template] of Object.entries(templates)) {
            rendered[key] = await engine.parseAndRender(template, data);
        }
        return rendered;
    }

    async function processActionNode(node: ActionNode): Promise<void> {
        if (node.conditions && !(await checkConditions(node.conditions))) return;

        if (node.delay && node.delay > 0) {
            await new Promise((res) => setTimeout(res, node.delay));
        }

        await applyTransformations(node.transformations || []);
        const rendered = await renderTemplates(node.templates || {});
        _.set(data, `__templates.${node.id}`, rendered);

        const executor = executors[node.operation.type];
        if (!executor) throw new Error(`Unknown executor: ${node.operation.type}`);

        const result = await executor(node.operation, rendered, data);
        _.set(data, `__actionResults.${node.id}`, result);

        logs.push({ step: 'action_executed', node: node.id, result, rendered, timestamp: new Date() });
    }

    async function getNextNodeId(currentId: string, conditionStatus?: string): Promise<string | null> {
        const outgoing = edges.filter((e) => e.source === currentId && (!e.condition || e.condition === conditionStatus));
        for (const edge of outgoing) {
            if (!edge.conditions || edge.conditions.length === 0) return edge.target;
            if (await checkConditions(edge.conditions)) return edge.target;
        }
        return outgoing[0]?.target || null;
    }

    let currentNodeId: string | null = workflow.initialNodeId;
    const visited = new Set<string>();

    while (currentNodeId && !visited.has(currentNodeId)) {
        visited.add(currentNodeId);
        const node = nodeMap.get(currentNodeId);
        if (!node) {
            logs.push({ step: 'error', message: `Node ${currentNodeId} not found`, timestamp: new Date() });
            break;
        }
        logs.push({ step: 'node_enter', node: currentNodeId, timestamp: new Date() });
        if (node.type === 'start') {
            currentNodeId = await getNextNodeId(node.id);
        } else if (node.type === 'condition') {
            const passed = await checkConditions(node.conditions);
            currentNodeId = await getNextNodeId(node.id, passed ? 'passed' : 'failed');
        } else if (node.type === 'action') {
            await processActionNode(node);
            currentNodeId = await getNextNodeId(node.id);
        } else if (node.type === 'end') {
            currentNodeId = null;
        } else {
            throw new Error(`Unknown node type: ${(node as any).type}`);
        }
        logs.push({ step: 'node_exit', node: node.id, timestamp: new Date() });
    }
    logs.push({ step: 'complete', timestamp: new Date(), data: _.cloneDeep(data) });
    return { data, logs };
}