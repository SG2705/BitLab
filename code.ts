type GateInputType = boolean | null;
type GateConnectorType = number | string | null;
type ConnectionKey = [string, GateConnectorType];
type GateFnType = (inputs: GateInputType[]) => GateInputType;
type ConnectionConfig = [string, string, GateConnectorType, GateConnectorType];

class GateFunction {
  name: string;
  fn: GateFnType;

  constructor(name: string, fn: GateFnType) {
    this.name = name;
    this.fn = fn;
  }

  call(ips: GateInputType[]): GateInputType {
    return this.fn(ips);
  }

  toString(): string {
    return `GateOperation(${this.name})`;
  }
}

class GateFunctionRegistry {
  private static andImpl(inputs: GateInputType[]): GateInputType {
    if (inputs.length === 0 || inputs.some((i) => typeof i !== "boolean")) {
      return null;
    }

    return inputs.every((i) => i);
  }

  private static orImpl(inputs: GateInputType[]): GateInputType {
    if (inputs.length === 0 || inputs.some((i) => typeof i !== "boolean")) {
      return null;
    }

    return inputs.some((i) => i);
  }

  private static notImpl(inputs: GateInputType[]): GateInputType {
    if (inputs.length === 0 || typeof inputs[0] !== "boolean") {
      return null;
    }

    return !inputs[0];
  }

  static AND = new GateFunction("AND", GateFunctionRegistry.andImpl);
  static OR = new GateFunction("OR", GateFunctionRegistry.orImpl);
  static NOT = new GateFunction("NOT", GateFunctionRegistry.notImpl);
  static OPERATION_REGISTRY: Record<string, GateFunction> = {
    AND: GateFunctionRegistry.AND,
    OR: GateFunctionRegistry.OR,
    NOT: GateFunctionRegistry.NOT,
  };
}

interface GateConfig {
  id: string;
  operation: string;
  inputs: GateInputType[];
  outputs: GateInputType[];
  isCircuit: boolean;
}

class Gate {
  private gid: string;
  private operation: GateFunction | null;
  private inputs: GateInputType[];
  private outputs: GateInputType[];
  private _circuit: Circuit | null;

  constructor(
    operation: GateFunction | null = null,
    options?: {
      gid?: string;
      inputs?: GateInputType[];
      outputs?: GateInputType[];
    },
  ) {
    this.gid = options?.gid ?? crypto.randomUUID();

    this.operation = operation;
    this.inputs = options?.inputs ?? [];
    this.outputs = options?.outputs ?? [];
    this._circuit = null;
  }

  toString(_level = 0): string {
    return `Gate (gid=${this.gid} fn=${this.operation} inputs=[${this.inputs.join(",")}] outputs=[${this.outputs.join(",")}] circuit=${this._circuit?.name})`;
  }

  get id() {
    return this.gid;
  }

  get input(): GateInputType[] {
    return [...this.inputs];
  }

  set input(inputs: GateInputType[]) {
    this.inputs = [...inputs];
  }

  setInputAt(index: number, value: GateInputType) {
    if (!Number.isInteger(index) || index < 0) {
      throw new Error(`Invalid input index: ${index}`);
    }

    while (this.inputs.length <= index) {
      this.inputs.push(null);
    }

    this.inputs[index] = value;
  }

  get output() {
    return this.outputs;
  }

  get isCircuit() {
    return false;
  }

  get circuit() {
    return this._circuit;
  }

  set circuit(c: Circuit | null) {
    this._circuit = c;
  }

  compute() {
    if (this.operation === null) {
      throw new Error("Operation not defined");
    }

    this.outputs = [this.operation.call(this.inputs)];
  }

  connectTo(
    targetNode: Gate | Circuit,
    connectFromHandle: GateConnectorType = null,
    connectToHandle: GateConnectorType = null,
  ) {
    if (this._circuit === null) {
      throw new Error(`${this.gid} is not attached to circuit`);
    }

    if (targetNode.circuit !== this._circuit) {
      throw new Error(
        `${targetNode.id} is not in the same circuit as ${this.gid}`,
      );
    }

    return this._circuit.manageConnection(
      this.id,
      targetNode.id,
      connectFromHandle,
      connectToHandle,
    );
  }

  disconnectFrom(
    targetNode: Gate | Circuit,
    connectFromHandle: GateConnectorType = null,
    connectToHandle: GateConnectorType = null,
  ) {
    if (this._circuit === null) {
      throw new Error(`${this.gid} is not attached to circuit`);
    }

    if (targetNode.circuit !== this._circuit) {
      throw new Error(
        `${targetNode.id} is not in the same circuit as ${this.gid}`,
      );
    }

    return this._circuit.manageConnection(
      this.id,
      targetNode.id,
      connectFromHandle,
      connectToHandle,
      false,
    );
  }

  export() {
    if (!this.operation) {
      throw new Error("Operation not defined");
    }

    return {
      id: this.gid,
      operation: this.operation.name,
      inputs: [...this.inputs],
      outputs: [...this.outputs],
      isCircuit: this.isCircuit,
    };
  }

  static import(config: GateConfig): InstanceType<typeof Gate> {
    const operation = GateFunctionRegistry.OPERATION_REGISTRY[config.operation];

    if (!operation) {
      throw new Error(`Unknown operation: ${config.operation}`);
    }

    return new this(operation, {
      gid: config.id,
      inputs: [...(config.inputs ?? [])],
      outputs: [...(config.outputs ?? [])],
    });
  }
}

class Connection {
  private connections: Map<string, string[]>;
  private back_connections: Map<string, string>;

  constructor() {
    this.connections = new Map<string, string[]>();
    this.back_connections = new Map<string, string>();
  }

  get size() {
    return this.connections.size;
  }

  get oneVone() {
    return Array.from(this.back_connections).map(([target, source]) => [
      Connection.decodeKey(source),
      Connection.decodeKey(target),
    ]);
  }

  saveConnection(
    sourceNodeId: string,
    targetNodeId: string,
    connectFromHandle: GateConnectorType = null,
    connectToHandle: GateConnectorType = null,
  ) {
    const sourceKey = Connection.encodeKey(sourceNodeId, connectFromHandle);
    const targetKey = Connection.encodeKey(targetNodeId, connectToHandle);

    if (this.back_connections.has(targetKey)) {
      throw new Error(`Target ${targetKey} input is already connected`);
    }

    this.back_connections.set(targetKey, sourceKey);

    if (this.connections.has(sourceKey)) {
      this.connections.get(sourceKey)?.push(targetKey);

      return true;
    }

    this.connections.set(sourceKey, [targetKey]);

    return true;
  }

  omitConnection(
    sourceNodeId: string,
    targetNodeId: string,
    connectFromHandle: GateConnectorType = null,
    connectToHandle: GateConnectorType = null,
  ) {
    const sourceKey = Connection.encodeKey(sourceNodeId, connectFromHandle);
    const targetKey = Connection.encodeKey(targetNodeId, connectToHandle);

    if (!this.back_connections.has(targetKey)) {
      throw new Error("No such connection exists");
    }

    this.back_connections.delete(targetKey);

    if (!this.connections.has(sourceKey)) {
      return false;
    }

    const newTargetConnections =
      this.connections.get(sourceKey)?.filter((c) => c !== targetKey) ?? [];

    if (newTargetConnections.length === 0) {
      this.connections.delete(sourceKey);

      return true;
    }

    this.connections.set(sourceKey, newTargetConnections);

    return true;
  }

  getConnectedTo(nodeId: string) {
    const validConnections: [
      string,
      GateConnectorType,
      string,
      GateConnectorType,
    ][] = [];

    const sourceConnections = [...this.connections.keys()]
      .map((c) => Connection.decodeKey(c))
      .filter((c) => c[0] === nodeId)
      .map(([sourceKey, handle]) => Connection.encodeKey(sourceKey, handle));

    sourceConnections.forEach((sourceConnection) => {
      const [sourceId, sourceHandle] = Connection.decodeKey(sourceConnection);

      const targetConnections = (
        this.connections.get(sourceConnection) ?? []
      ).map((c) => Connection.decodeKey(c));

      targetConnections.forEach(([targetId, targetHandle]) => {
        validConnections.push([sourceId, sourceHandle, targetId, targetHandle]);
      });
    });

    return validConnections;
  }

  omitConnectedTo(nodeId: string) {
    const sourceConnections = [...this.connections.keys()]
      .map((c) => Connection.decodeKey(c))
      .filter((c) => c[0] === nodeId);

    sourceConnections.forEach((sourceConnection) => {
      const [sourceId, sourceHandle] = sourceConnection;

      const targetConnections = [
        ...(this.connections.get(
          Connection.encodeKey(sourceId, sourceHandle),
        ) ?? []),
      ].map((c) => Connection.decodeKey(c));

      targetConnections.forEach(([targetId, targetHandle]) => {
        this.omitConnection(sourceId, targetId, sourceHandle, targetHandle);
      });
    });

    // Remove incoming connections (other nodes pointing to this node)
    const targetConnections = [...this.back_connections.keys()].filter(
      (k) => Connection.decodeKey(k)[0] === nodeId,
    );

    targetConnections.forEach((targetConnection) => {
      const [targetId, targetHandle] = Connection.decodeKey(targetConnection);
      const sourceConnection = this.back_connections.get(targetConnection);

      if (sourceConnection) {
        const [sourceId, sourceHandle] = Connection.decodeKey(sourceConnection);

        this.omitConnection(sourceId, targetId, sourceHandle, targetHandle);
      }
    });
  }

  hasTarget(nodeId: string, handle: GateConnectorType) {
    const targetKey = Connection.encodeKey(nodeId, handle);

    return this.back_connections.has(targetKey);
  }

  static encodeKey(id: string, handle: GateConnectorType) {
    return JSON.stringify([id, handle]);
  }

  static decodeKey(key: string): ConnectionKey {
    const [id, handle] = JSON.parse(key);

    return [id, handle];
  }

  export(): ConnectionConfig[] {
    return this.oneVone.map(([source, target]) => [
      source[0],
      target[0],
      source[1],
      target[1],
    ]);
  }

  static import(
    connections: ConnectionConfig[],
  ): InstanceType<typeof Connection> {
    const connection = new this();

    connections.forEach(([sourceId, targetId, sourceHandle, targetHandle]) => {
      connection.saveConnection(sourceId, targetId, sourceHandle, targetHandle);
    });

    return connection;
  }
}

interface CircuitConfig {
  id: string;
  cName: string;
  nodes: (GateConfig | CircuitConfig)[];
  links: ConnectionConfig[];
  probes: Record<string, ConnectionKey[]>;
  probeValues: Record<string, GateInputType>;
  scopes: Record<string, ConnectionKey>;
  isCircuit: boolean;
}

class Circuit extends Gate {
  private cid: string;
  private cName: string;

  private nodes: Record<string, Gate | Circuit>;
  private connection: Connection;

  private probes: Record<string, string[]>;
  private probeValueMap: Record<string, GateInputType>;

  private scopes: Record<string, string>;

  constructor(
    cName?: string,
    options?: {
      cid?: string;
      connection?: Connection;
    },
  ) {
    super();

    this.cid = options?.cid ?? crypto.randomUUID();
    this.cName = cName ?? `Circuit-${this.cid}`;

    this.nodes = {};
    this.connection = options?.connection ?? new Connection();

    this.probes = {};
    this.probeValueMap = {};
    this.scopes = {};
  }

  toString(level = 0): string {
    const spacer = "    ";
    const nnTabSpacing = spacer.repeat(level + 2);
    const nTabSpacing = spacer.repeat(level + 1);
    const nodeString = Object.values(this.nodes)
      .map((n) => n.toString(level + 2))
      .join("\n" + nnTabSpacing);
    const linkString = this.connection.oneVone
      .map(
        ([source, target]) =>
          `[${source[0]}, ${source[1] ?? "null"}] => [${target[0]}, ${target[1] ?? "null"}]`,
      )
      .join("\n" + nnTabSpacing);

    return (
      `Circuit (${this.cName}) \n` +
      `${nTabSpacing}nodes:` +
      `\n${nnTabSpacing}${nodeString}\n${nTabSpacing}` +
      (this.connection.size > 0
        ? "links:" + `\n${nnTabSpacing}${linkString}`
        : "")
    );
  }

  get id() {
    return this.cid;
  }

  get name() {
    return this.cName;
  }

  get isCircuit() {
    return true;
  }

  private isValidNode(nodeId: string) {
    if (!(nodeId in this.nodes)) {
      throw new Error(`Node with ${nodeId} doesn't exist in circuit`);
    }
  }

  private moveSignal(nodeId: string) {
    this.isValidNode(nodeId);

    let iterations = 0;
    const ALLOWED_ITERATIONS = Math.max(
      100,
      Object.keys(this.nodes).length ** 2,
    );

    const visited: Record<string, string> = {};
    const queue = [this.nodes[nodeId]];

    while (queue.length) {
      if (iterations >= ALLOWED_ITERATIONS) {
        throw new Error("Signal propagation exceeded max iterations");
      }

      iterations = iterations + 1;

      const currentNode = queue.shift();

      if (!currentNode) {
        continue;
      }

      currentNode.compute();

      const currentNodeInput = [...currentNode.input];
      const currentNodeOutput: GateInputType[] | Record<string, GateInputType> =
        currentNode instanceof Circuit
          ? { ...currentNode.getScopeOutput() }
          : [...currentNode.output];

      const visitedValue = JSON.stringify([
        currentNodeInput,
        currentNodeOutput,
      ]);

      if (
        currentNode.id in visited &&
        visited[currentNode.id] === visitedValue
      ) {
        continue;
      }

      visited[currentNode.id] = visitedValue;

      const connections = this.connection.getConnectedTo(currentNode.id);

      connections.forEach(([_, sourceHandle, targetId, targetHandle]) => {
        const targetNode = this.nodes[targetId];

        if (!targetNode || targetHandle === null || sourceHandle === null) {
          return;
        }

        let sourceValue: GateInputType;

        if (Array.isArray(currentNodeOutput)) {
          const idx = Number(sourceHandle);

          sourceValue = currentNodeOutput[idx] ?? null;
        } else {
          const key = String(sourceHandle);

          sourceValue = currentNodeOutput[key] ?? null;
        }

        if (targetNode instanceof Circuit) {
          targetNode.setProbes({ [String(targetHandle)]: sourceValue });
        } else {
          targetNode.setInputAt(Number(targetHandle), sourceValue);
        }

        queue.push(targetNode);
      });
    }
  }

  manageConnection(
    sourceNodeId: string,
    targetNodeId: string,
    connectFromHandle: GateConnectorType = null,
    connectToHandle: GateConnectorType = null,
    isCreate = true,
  ) {
    this.isValidNode(sourceNodeId);
    this.isValidNode(targetNodeId);

    if (isCreate) {
      const targetKey = Connection.encodeKey(targetNodeId, connectToHandle);

      for (const [probeId, targets] of Object.entries(this.probes)) {
        if (targets.includes(targetKey)) {
          throw new Error(
            `Target input is already attached to probe "${probeId}"`,
          );
        }
      }

      return this.connection.saveConnection(
        sourceNodeId,
        targetNodeId,
        connectFromHandle,
        connectToHandle,
      );
    }

    return this.connection.omitConnection(
      sourceNodeId,
      targetNodeId,
      connectFromHandle,
      connectToHandle,
    );
  }

  addNode(node: Gate | Circuit) {
    if (node.id in this.nodes) {
      throw new Error("Node with same ID already exists");
    }

    if (node.circuit !== null && node.circuit !== this) {
      throw new Error("Node is already attached to a different circuit");
    }

    node.circuit = this;
    this.nodes[node.id] = node;
  }

  deleteNode(nodeId: string) {
    this.isValidNode(nodeId);

    this.connection.omitConnectedTo(nodeId);

    this.nodes[nodeId].circuit = null;

    delete this.nodes[nodeId];

    return true;
  }

  compute() {
    const signalMap: string[] = [];

    Object.entries(this.probeValueMap).forEach(([probeId, probeValue]) => {
      const targetProbeKeys = this.probes[probeId];

      if (targetProbeKeys) {
        targetProbeKeys.forEach((targetProbeKey) => {
          const [targetId, handle] = Connection.decodeKey(targetProbeKey);

          if (this.nodes[targetId] && handle !== null) {
            const targetNode = this.nodes[targetId];

            if (targetNode instanceof Circuit) {
              targetNode.setProbes({ [String(handle)]: probeValue });
            } else {
              targetNode.setInputAt(Number(handle), probeValue);
            }

            signalMap.push(targetNode.id);
          }
        });
      }
    });

    signalMap.forEach((sg) => this.moveSignal(sg));
  }

  addProbe(probeId: string, targetId: string, index: GateConnectorType = null) {
    this.isValidNode(targetId);

    const targetKey = Connection.encodeKey(targetId, index);

    if (this.connection.hasTarget(targetId, index)) {
      throw new Error("Target input is already connected");
    }

    for (const [pid, targets] of Object.entries(this.probes)) {
      if (targets.includes(targetKey)) {
        throw new Error(`Target input is already attached to probe "${pid}"`);
      }
    }

    this.probeValueMap[probeId] = null;

    if (probeId in this.probes) {
      this.probes[probeId].push(targetKey);

      return;
    }

    this.probes[probeId] = [targetKey];
  }

  getProbes() {
    const copy: Record<string, string[]> = {};

    for (const [k, v] of Object.entries(this.probes)) {
      copy[k] = [...v];
    }
    return copy;
  }

  deleteProbe(probeId: string) {
    if (!(probeId in this.probes)) {
      return false;
    }

    delete this.probes[probeId];
    delete this.probeValueMap[probeId];

    return true;
  }

  setProbes(probeMap: Record<string, GateInputType>) {
    Object.entries(probeMap).forEach(([probeId, probeValue]) => {
      if (!(probeId in this.probes)) {
        throw new Error(`Unknown probe ID: ${probeId}`);
      }

      this.probeValueMap[probeId] = probeValue;
    });
  }

  addScope(scopeId: string, nodeId: string, index: GateConnectorType = null) {
    this.scopes[scopeId] = Connection.encodeKey(nodeId, index);
  }

  getScopes() {
    const scopes: Record<string, ConnectionKey> = {};

    Object.entries(this.scopes).forEach(([scopeId, targetKey]) => {
      scopes[scopeId] = Connection.decodeKey(targetKey);
    });

    return scopes;
  }

  deleteScope(scopeId: string) {
    if (!(scopeId in this.scopes)) {
      return false;
    }

    delete this.scopes[scopeId];

    return true;
  }

  getScopeOutput() {
    const results: Record<string, GateInputType> = {};

    Object.entries(this.scopes).forEach(([scopeId, targetKey]) => {
      const [targetId, handle] = Connection.decodeKey(targetKey);

      if (!(targetId in this.nodes) || handle === null) {
        results[scopeId] = null;

        return;
      }

      const node = this.nodes[targetId];

      if (node instanceof Circuit) {
        results[scopeId] = node.getScopeOutput()[String(handle)] ?? null;
      } else {
        results[scopeId] = node.output[Number(handle)] ?? null;
      }
    });

    return results;
  }

  exportCircuit(): CircuitConfig {
    const probes: Record<string, ConnectionKey[]> = {};
    const scopes: Record<string, ConnectionKey> = {};

    Object.entries(this.probes).forEach(([probeId, targets]) => {
      probes[probeId] = targets.map((k) => Connection.decodeKey(k));
    });

    Object.entries(this.scopes).forEach(([scopeId, targetKey]) => {
      scopes[scopeId] = Connection.decodeKey(targetKey);
    });

    return {
      id: this.cid,
      cName: this.cName,
      nodes: [
        ...Object.values(this.nodes).map((n) =>
          n instanceof Circuit ? n.exportCircuit() : n.export(),
        ),
      ],
      links: [...this.connection.export()],
      probes,
      probeValues: { ...this.probeValueMap },
      scopes,
      isCircuit: this.isCircuit,
    };
  }

  static importCircuit(config: CircuitConfig): InstanceType<typeof Circuit> {
    const newCircuit = new this(config.cName, {
      cid: config.id,
      connection: Connection.import(config.links),
    });

    config.nodes.forEach((nodeConfig) => {
      if (nodeConfig.isCircuit) {
        newCircuit.addNode(this.importCircuit(nodeConfig as CircuitConfig));
      } else {
        newCircuit.addNode(Gate.import(nodeConfig as GateConfig));
      }
    });

    Object.entries(config.probes).forEach(([probeId, connections]) => {
      connections.forEach(([nodeId, handle]) => {
        newCircuit.addProbe(probeId, nodeId, handle);
      });
    });

    Object.entries(config.scopes).forEach(([scopeId, [nodeId, handle]]) => {
      newCircuit.addScope(scopeId, nodeId, handle);
    });

    if (config.probeValues) {
      newCircuit.setProbes(config.probeValues);
    }

    return newCircuit;
  }
}

const g1 = new Gate(GateFunctionRegistry.AND);
const g2 = new Gate(GateFunctionRegistry.NOT);
const c1 = new Circuit("NAND");

c1.addNode(g1);
c1.addNode(g2);

g1.connectTo(g2, 0, 0);

c1.addProbe("a", g1.id, 0);
c1.addProbe("b", g1.id, 1);
c1.setProbes({ a: true, b: false });

c1.addScope("o", g2.id, 0);
c1.compute();

const g3 = new Gate(GateFunctionRegistry.NOT);
const c2 = new Circuit("NOT-NAND");

c2.addNode(c1);
c2.addNode(g3);

c1.connectTo(g3, "o", 0);

c2.addProbe("in1", c1.id, "a");
c2.addProbe("in2", c1.id, "b");
c2.setProbes({ in1: true, in2: true });
c2.addScope("out", g3.id, 0);

c2.compute();

const cexp = c2.exportCircuit();
const newC = Circuit.importCircuit(cexp);
newC.compute();

console.log(c2.getScopeOutput());
console.log(newC.toString());
