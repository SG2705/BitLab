import uuid
from dataclasses import dataclass, asdict
from typing import Optional, List, Dict, Union, Tuple, Callable

# Shared type alias — indexes can be ints (positional) or strs (named probes/scopes)
IndexType = Union[int, str]
ConnectionKey = Tuple[str, IndexType]

class GateFunction:
	"""A callable wrapper around a gate logic function.

	Wraps a named function so it can be invoked directly as a gate operation
	while retaining a human-readable name for display and registry lookup.

	Attributes:
		name (str): The display name of the gate operation (e.g. "AND", "OR").
		fn (Callable): The underlying logic function that accepts a list of
			boolean inputs and returns a boolean result.
	"""

	def __init__(self, name: str, fn: Callable) -> None:
		"""Initialize a GateFunction.

		Args:
			name: The display name for this gate operation.
			fn: A callable that takes a list of Optional[bool] and returns
				Optional[bool].
		"""
		self.name = name
		self.fn = fn
		
	def __call__(self, ips: List[Optional[bool]]) -> Optional[bool]:
		"""Execute the wrapped gate function.

		Args:
			ips: A list of boolean (or None) input values.

		Returns:
			The boolean result of applying the gate logic to the inputs,
			or None if the inputs are insufficient or contain None values.
		"""
		return self.fn(ips)
	
	def __repr__(self) -> str:
		"""Return a string representation of the gate operation."""
		return f"<Gate_Operation {self.name}>"
	
class GateFunctionRegistry:
	"""Registry of built-in logic gate operations.

	Provides static implementations of fundamental boolean logic gates (AND, OR,
	NOT) and exposes them as GateFunction instances via the OPERATION_REGISTRY
	dictionary for dynamic lookup by name.

	Class Attributes:
		AND (GateFunction): Logical AND — returns True only if all inputs are True.
		OR (GateFunction): Logical OR — returns True if any input is True.
		NOT (GateFunction): Logical NOT — inverts the first input value.
		OPERATION_REGISTRY (Dict[str, GateFunction]): Name-to-GateFunction mapping
			for all registered operations.
	"""

	@staticmethod
	def _validate_ips(ips: List[Optional[bool]]) -> None:
		"""Validate that every element in the input list is a bool or None.

		Args:
			ips: The list of input values to validate.

		Raises:
			ValueError: If any value is neither a bool nor None.
		"""
		for v in ips:
			if v is not None and not isinstance(v, bool):
				raise ValueError("All values must be boolean or None")
			
	@staticmethod
	def _and_impl(ips: List[Optional[bool]]) -> Optional[bool]:
		"""Compute the logical AND of all inputs.

		Returns None if the input list is empty or contains any None values.
		Otherwise returns True only when every input is True.

		Args:
			ips: A list of boolean (or None) input values.

		Returns:
			True if all inputs are True, False if any input is False,
			or None if inputs are empty or contain None.
		"""
		GateFunctionRegistry._validate_ips(ips)
		
		if len(ips) == 0 or any(v is None for v in ips):
			return None
		
		for v in ips:
			if not v:
				return False
		
		return True
	
	@staticmethod
	def _or_impl(ips: List[Optional[bool]]) -> Optional[bool]:
		"""Compute the logical OR of all inputs.

		Returns None if the input list is empty or contains any None values.
		Otherwise returns True if at least one input is True.

		Args:
			ips: A list of boolean (or None) input values.

		Returns:
			True if any input is True, False if all inputs are False,
			or None if inputs are empty or contain None.
		"""
		GateFunctionRegistry._validate_ips(ips)
		
		if len(ips) == 0 or any(v is None for v in ips):
			return None
		
		for v in ips:
			if v:
				return True
		
		return False
		
	@staticmethod
	def _not_impl(ips: List[Optional[bool]]) -> Optional[bool]:
		"""Compute the logical NOT of the first input.

		Returns None if the input list is empty or the first value is None.
		Otherwise returns the boolean inverse of the first element.

		Args:
			ips: A list containing at least one boolean (or None) value.
				Only the first element is used.

		Returns:
			The negation of ips[0], or None if unavailable.
		"""
		GateFunctionRegistry._validate_ips(ips)
		if len(ips) == 0 or ips[0] is None:
			return None
		
		return not ips[0]
	
	AND: "GateFunction" = GateFunction("AND", _and_impl)
	OR: "GateFunction" = GateFunction("OR", _or_impl)
	NOT: "GateFunction" = GateFunction("NOT", _not_impl)

	OPERATION_REGISTRY: Dict[str, "GateFunction"] = {
		"AND": AND,
		"OR": OR,
		"NOT": NOT
	}

@dataclass
class GateConfig:
	"""Data class representing the serializable configuration of a Gate.

	Used for persisting and restoring gate state. Can be converted to and
	from a plain dictionary via ``to_dict()`` and the dataclass ``asdict``
	helper.

	Attributes:
		gid (str): Unique identifier for the gate.
		operation (str): Name of the gate operation (must match a key in
			GateFunctionRegistry.OPERATION_REGISTRY).
		inputs (List[Optional[bool]]): Current input values of the gate.
		outputs (List[Optional[bool]]): Current output values of the gate.
	"""

	gid: str
	operation: str
	inputs: List[Optional[bool]]
	outputs: List[Optional[bool]]

	def to_dict(self) -> dict:
		"""Convert this config to a plain dictionary.

		Returns:
			A dictionary representation of all fields.
		"""
		return asdict(self)

@dataclass
class CircuitConfig:
	"""Data class representing the serializable configuration of a Circuit.

	Captures the full topology of a circuit including its nodes, connections,
	probes, and scopes so it can be persisted and restored.

	Attributes:
		cid (str): Unique circuit identifier.
		name (str): Human-readable circuit name.
		nodes (List[Union[GateConfig, "CircuitConfig"]]): Configs for all
			child nodes (gates and sub-circuits).
		connections (Dict[str, List[List]]): Adjacency list mapping
			serialized source keys to lists of serialized target keys.
		probes (Dict[str, List[List]]): Probe-to-target mappings.
		scopes (Dict[str, List]): Scope-to-(node_id, index) mappings.
	"""

	cid: str
	name: str
	nodes: List[Union[GateConfig, "CircuitConfig"]]
	connections: Dict[str, List[List]]
	probes: Dict[str, List[List]]
	scopes: Dict[str, List]

	def to_dict(self) -> dict:
		"""Convert this config to a plain dictionary.

		Returns:
			A dictionary representation of all fields.
		"""
		return asdict(self)
	
class Gate:
	"""A single logic gate that can be wired into a Circuit.

	A Gate holds an operation (a GateFunction), a list of boolean inputs, and
	a list of boolean outputs. Gates can be connected to other gates inside a
	Circuit so that output signals propagate automatically.

	Attributes:
		_gid (str): Unique gate identifier (auto-generated UUID if not provided).
		_operation (Optional[Callable]): The logic function executed on compute.
		_inputs (List[Optional[bool]]): Current input signal values.
		_outputs (List[Optional[bool]]): Current output signal values.
		_circuit (Optional[Circuit]): The parent circuit this gate belongs to.
	"""

	def __init__(
			self,
			operation: Optional[GateFunction] = None,
			*,
			gid: Optional[str] = None,
			inputs: List[Optional[bool]] = None,
			outputs: List[Optional[bool]] = None
		) -> None:
		"""Initialize a Gate.

		Args:
			operation: A callable gate function (e.g. GateFunctionRegistry.AND).
			gid: Optional unique identifier. A UUID is generated if omitted.
			inputs: Initial input values. Defaults to an empty list.
			outputs: Initial output values. Defaults to an empty list.
		"""
		self._gid = gid or uuid.uuid4().hex

		self._operation: Optional[GateFunction] = operation
		self._inputs: List[Optional[bool]] = inputs or []
		self._outputs: List[Optional[bool]] = outputs or []
		self._circuit: Optional["Circuit"] = None

	def __repr__(self) -> str:
		"""Return a detailed string representation of the gate."""
		return (f"Gate(gid={self._gid}, fn={self._operation}, inputs={self._inputs}, outputs={self._outputs}, circuit={self._circuit.get_id() if self._circuit else None})")
	
	def __is_valid_input(self, values: List[Optional[bool]]) -> bool:
		"""Check whether *values* is a valid input list (bools and Nones only).

		Args:
			values: The candidate input list.

		Returns:
			True if valid, False otherwise.
		"""
		if not isinstance(values, list):
			return False

		for v in values:
			if v is not None and not isinstance(v, bool):
				return False

		return True

	def _is_circuit(self) -> bool:
		"""Return False — a plain Gate is not a Circuit."""
		return False
	
	def get_id(self) -> str:
		"""Return the unique identifier of this gate."""
		return self._gid
	
	def get_input(self) -> List[Optional[bool]]:
		"""Return the current list of input values."""
		return self._inputs
	
	def set_input(self, values: List[Optional[bool]]) -> bool:
		"""Replace the gate's input values.

		The new values are accepted only if they pass validation (list of
		bools / Nones).

		Args:
			values: The new input values.

		Returns:
			True if the inputs were updated, False if validation failed.
		"""
		if self.__is_valid_input(values):
			self._inputs = values

			return True

		return False
			
	def get_output(self) -> List[Optional[bool]]:
		"""Return the current list of output values."""
		return self._outputs
	
	def compute(self) -> bool:
		"""Execute the gate's operation on its current inputs.

		The result is stored as a single-element list in ``_outputs``.

		Returns:
			True on successful computation.

		Raises:
			ValueError: If no operation has been assigned.
			TypeError: If the assigned operation is not callable.
		"""
		if self._operation is None:
			raise ValueError("Operation not defined")

		if not callable(self._operation):
			raise TypeError("Operation must be callable")

		self._outputs = [self._operation(self._inputs)]

		return True
	
	def connect_to(self, target: "Gate", src_idx: IndexType = 0, tar_idx: IndexType = 0) -> bool:
		"""Create a connection from this gate's output to another gate's input.

		Both gates must belong to the same circuit.

		Args:
			target: The destination gate.
			src_idx: Output index (or scope name) on this gate.
			tar_idx: Input index (or probe name) on the target gate.

		Returns:
			True if the connection was created successfully.

		Raises:
			ValueError: If this gate is not attached to a circuit, or if
				the target gate belongs to a different circuit.
		"""
		if self._circuit is None:
			raise ValueError(f"{self.get_id()} is not attached to circuit")
		
		if target._circuit is not self._circuit:
			raise ValueError(f"{target.get_id()} is not in the same circuit as {self.get_id()}")
		
		return self._circuit._create_connection(self.get_id(), target.get_id(), src_idx, tar_idx)
	
	def disconnect_from(self, target: "Gate", src_idx: IndexType = 0, tar_idx: IndexType = 0) -> bool:
		"""Remove an existing connection from this gate to a target gate.

		Args:
			target: The destination gate to disconnect from.
			src_idx: Output index (or scope name) on this gate.
			tar_idx: Input index (or probe name) on the target gate.

		Returns:
			True if the connection was removed successfully.

		Raises:
			ValueError: If this gate is not attached to a circuit, or if
				the target gate belongs to a different circuit.
		"""
		if self._circuit is None:
			raise ValueError(f"{self.get_id()} is not attached to circuit")

		if target._circuit is not self._circuit:
			raise ValueError(f"{target.get_id()} is not in the same circuit as {self.get_id()}")

		return self._circuit._delete_connection(self.get_id(), target.get_id(), src_idx, tar_idx)
	
	def to_config(self) -> GateConfig:
		"""Serialize this gate into a GateConfig.

		Returns:
			A GateConfig snapshot of the gate's current state.

		Raises:
			ValueError: If no operation is assigned to the gate.
		"""
		if not self._operation:
			raise ValueError("Operation not defined")
		
		return GateConfig(
			gid=self._gid,
			operation=self._operation.name,
			inputs=list(self._inputs),
			outputs=list(self._outputs),
		)

	@classmethod
	def from_config(cls, config: Union[GateConfig, dict]) -> "Gate":
		"""Create a Gate instance from a GateConfig or a plain dictionary.

		Looks up the operation by name in GateFunctionRegistry.OPERATION_REGISTRY.

		Args:
			config: A GateConfig (or dict with the same keys) containing
				the gate's persisted state.

		Returns:
			A new Gate initialised with the config values.

		Raises:
			ValueError: If the operation name is not found in the registry.
		"""
		if isinstance(config, dict):
			config = GateConfig(**config)

		operation = GateFunctionRegistry.OPERATION_REGISTRY.get(config.operation)
		
		if not operation:
			raise ValueError(f"Unknown operation: {config.operation}")
		
		return cls(
			gid=config.gid,
			operation=operation,
			inputs=list(config.inputs or []),
			outputs=list(config.outputs or []),
		)
	
class Circuit(Gate):
	"""A composite logic circuit that contains interconnected Gates and sub-Circuits.

	Circuit extends Gate, so it can be nested inside other circuits. Internally
	it manages a graph of nodes (gates / sub-circuits) connected by directed
	edges. External inputs enter through *probes* and results are read through
	*scopes*.

	Attributes:
		_cid (str): Unique circuit identifier.
		_name (str): Human-readable circuit name.
		_nodes (Dict[str, Union[Gate, Circuit]]): Gates and sub-circuits keyed
			by their ID.
		_connections (Dict[Tuple[str, int], List[Tuple[str, int]]]): Adjacency
			list mapping (source_id, output_index) to a list of
			(target_id, input_index) tuples.
		_connections_target (Dict[Tuple[str, int], Tuple[str, int]]): Reverse
			mapping from each target input slot to its single source.
		_probes (Dict[str, List[Tuple[str, int]]]): Named external input
			points that feed signals into the circuit's internal nodes.
		_probe_map (Dict[str, Optional[bool]]): Current value for each probe.
		_scopes (Dict[str, Tuple[str, int]]): Named external output points
			that read signals from internal nodes.
	"""

	def __init__(self, name: str = None) -> None:
		"""Initialize a Circuit.

		Args:
			name: Optional human-readable name. Defaults to
				``Circuit-<uuid>``.
		"""
		super().__init__(operation=None)
		
		self._cid = uuid.uuid4().hex
		self._name = name or f"Circuit-{self._cid}"
		
		self._nodes: Dict[str, Union[Gate, "Circuit"]] = {}
		self._connections: Dict[ConnectionKey, List[ConnectionKey]] = {}
		self._connections_target: Dict[ConnectionKey, ConnectionKey] = {}
		
		self._probes: Dict[str, List[ConnectionKey]] = {}
		self._probe_map: Dict[str, Optional[bool]] = {}

		self._scopes: Dict[str, Tuple[str, IndexType]] = {}
	
	def __repr__(self) -> str:
		"""Return a multi-line string showing all nodes and connections."""
		node_string = ''
		link_string = ''

		for v in self._nodes.values():
			node_string += f"\t{v}\n\t"

		node_string = f'Nodes(\n\t{node_string})' if len(node_string) > 0 else 'Nodes()'

		for k, v in self._connections.items():
			link_string += f"\t{k} => {v}\n\t"

		link_string = f'Links(\n\t{link_string})' if len(link_string) > 0 else 'Links()'

		return (f"Circuit(\n\tcid={self._name}\n\t{node_string}\n\t{link_string}\n)")
	
	def __is_node(self, node_id: str) -> None:
		"""Verify that *node_id* exists in this circuit's node map.

		Args:
			node_id: The identifier to look up.

		Raises:
			ValueError: If the node does not exist.
		"""
		if node_id not in self._nodes:
			raise ValueError(f"Node {node_id} does not exist")
	
	def __ensure_size(self, arr: list, index: int) -> None:
		"""Pad *arr* with None values until it has at least *index + 1* elements.

		Args:
			arr: The list to extend in-place.
			index: The target index that must be accessible.
		"""
		while len(arr) <= index:
			arr.append(None)

	def _is_circuit(self) -> bool:
		"""Return True — this node is a Circuit."""
		return True

	def _create_connection(self, source_id: str, target_id: str, src_idx: IndexType = 0, tar_idx: IndexType = 0) -> bool:
		"""Wire an output slot of one node to an input slot of another.

		Each target input slot may only have a single incoming connection.

		Args:
			source_id: ID of the source node.
			target_id: ID of the target node.
			src_idx: Output index (or scope name) on the source node.
			tar_idx: Input index (or probe name) on the target node.

		Returns:
			True if the connection was created.

		Raises:
			ValueError: If either node does not exist or the target input
				is already connected.
		"""
		self.__is_node(source_id)
		self.__is_node(target_id)

		source_key = (source_id, src_idx)
		target_key = (target_id, tar_idx)

		if target_key in self._connections_target:
			raise ValueError("Target input is already connected")
		
		self._connections_target[target_key] = source_key
		targets = self._connections.setdefault(source_key, [])

		if target_key not in targets:
			targets.append(target_key)

		self._connections[source_key] = targets

		return True
	
	def _delete_connection(self, source_id: str, target_id: str, src_idx: IndexType = 0, tar_idx: IndexType = 0) -> bool:
		"""Remove an existing connection between two nodes.

		Args:
			source_id: ID of the source node.
			target_id: ID of the target node.
			src_idx: Output index (or scope name) on the source node.
			tar_idx: Input index (or probe name) on the target node.

		Returns:
			True if the connection was removed.

		Raises:
			ValueError: If the specified connection does not exist.
		"""
		source_key = (source_id, src_idx)
		target_key = (target_id, tar_idx)

		if target_key not in self._connections_target:
			raise ValueError("No such connection exists")

		self._connections_target.pop(target_key, None)

		if source_key in self._connections:
			if target_key in self._connections[source_key]:
				self._connections[source_key].remove(target_key)

			if not self._connections[source_key]:
				self._connections.pop(source_key)
		
		return True

	def _move_signal(self, node_id: str) -> None:
		"""Propagate signals forward from the given node using BFS.

		Starting at *node_id*, computes each node's output and pushes the
		results along all outgoing connections until no further changes occur
		(steady-state detection via a visited cache).

		Args:
			node_id: The ID of the node to start propagation from.

		Raises:
			ValueError: If *node_id* does not exist in this circuit.
		"""
		self.__is_node(node_id)

		iterations = 0
		max_iterations = len(self._nodes) ** 2

		visited = {}
		queue = [self._nodes[node_id]]
		

		while queue:
			if iterations >= max_iterations:
				raise RuntimeError(f"Signal propagation exceeded {max_iterations} iterations — possible oscillating circuit")
			
			iterations += 1

			current_node = queue.pop(0)
			current_node.compute()

			is_current_node_circuit = current_node._is_circuit()

			current_node_id = current_node.get_id()
			current_node_inputs = list(current_node.get_input())

			current_node_outputs = dict(current_node.get_scope_output()) if is_current_node_circuit else list(current_node.get_output())

			if current_node_id in visited and visited[current_node_id] == (current_node_inputs, current_node_outputs):
				continue

			visited[current_node_id] = (current_node_inputs, current_node_outputs)
			source_connections = [k for k in self._connections if k[0] == current_node_id]

			for source_connection in source_connections:
				_, source_idx = source_connection

				if not is_current_node_circuit and len(current_node_outputs) <= source_idx:
					continue

				target_connections = self._connections.get(source_connection, [])

				for target_connection in target_connections:
					target_id, target_idx = target_connection
	
					if target_id in self._nodes:
						target_node = self._nodes[target_id]

						is_target_node_circuit = target_node._is_circuit()

						if is_target_node_circuit:
							target_node.set_probes({ target_idx: current_node_outputs[source_idx] })
						else:
							target_inputs = target_node.get_input()
							self.__ensure_size(target_inputs, target_idx)

							target_inputs[target_idx] = current_node_outputs[source_idx]
							target_node.set_input(target_inputs)

						self._nodes[target_id] = target_node
						queue.append(self._nodes[target_id])
				
	def get_id(self) -> str:
		"""Return the unique circuit identifier (distinct from the gate ID)."""
		return self._cid
	
	def add_node(self, node: Union[Gate, "Circuit"]) -> bool:
		"""Add a gate or sub-circuit to this circuit.

		The node's ``_circuit`` reference is set to this circuit so that
		``connect_to`` / ``disconnect_from`` calls are routed here.

		Args:
			node: The Gate or Circuit to add.

		Returns:
			True if the node was added.

		Raises:
			ValueError: If a node with the same ID already exists.
		"""
		if node.get_id() in self._nodes:
			raise ValueError("Node already exists")
		
		self._nodes[node.get_id()] = node
		node._circuit = self

		return True
	
	def remove_node(self, node_id: str) -> bool:
		"""Remove a node and all of its connections from the circuit.

		Cleans up both outgoing and incoming connections before deleting
		the node itself.

		Args:
			node_id: The ID of the node to remove.

		Returns:
			True if the node was removed.

		Raises:
			ValueError: If the node does not exist.
		"""
		self.__is_node(node_id)

		# 1. Remove outgoing connections
		source_connections = [k for k in self._connections if k[0] == node_id]

		for src_conn in source_connections:
			source_id, src_idx = src_conn
			target_connections = list(self._connections.get(src_conn, []))

			for target_conn in target_connections:
				target_id, tar_idx = target_conn

				self._delete_connection(source_id, target_id, src_idx, tar_idx)

		# 2. Remove incoming connections (other nodes pointing to this node)
		target_connections = [k for k in list(self._connections_target.keys()) if k[0] == node_id]
		
		for target_conn in target_connections:
			target_id, tar_idx = target_conn
			source_id, src_idx = self._connections_target[target_conn]
			
			self._delete_connection(source_id, target_id, src_idx, tar_idx)
		
		# 3. Finally remove node
		self._nodes.pop(node_id, None)

		return True

	def compute(self) -> bool:
		"""Evaluate the entire circuit.

		Pushes each probe's current value into its connected nodes, then
		propagates signals through the internal graph via ``_move_signal``.

		Returns:
			True after the circuit has been evaluated.
		"""
		for probe_id, value in self._probe_map.items():
			target_keys = self._probes.get(probe_id, [])

			for target_key in target_keys:
				target_id, tar_idx = target_key

				if target_id in self._nodes:
					target_node = self._nodes[target_id]

					if target_node._is_circuit():
						target_node.set_probes({ tar_idx: value })
					else:
						target_inputs = target_node.get_input()
						self.__ensure_size(target_inputs, tar_idx)

						target_inputs[tar_idx] = value
						target_node.set_input(target_inputs)

					self._nodes[target_id] = target_node
					self._move_signal(target_id)
				elif target_id in self._probe_map:
					self._probe_map[target_id] = value

		return True
	
	def add_probe(self, probe_id: str, target_id: str, index: IndexType = 0) -> bool:
		"""Register a named external input (probe) that feeds into a node.

		Multiple probes can share the same name — setting that probe's value
		will fan out to every registered target.

		Args:
			probe_id: A string name for the probe (e.g. "A", "B").
			target_id: The ID of the internal node to feed.
			index: The input index on the target node.

		Returns:
			True if the probe was added.

		Raises:
			ValueError: If *probe_id* is not a string, *target_id* does not
				exist, or the target input slot is already connected.
		"""
		self.__is_node(target_id)

		if isinstance(probe_id, str) is False:
			raise ValueError("Probe ID must be a string")

		target_key = (target_id, index)

		if target_key in self._connections_target:
			raise ValueError("Target input is already connected")
		
		self._probe_map[probe_id] = None
	
		if probe_id not in self._probes:
			self._probes[probe_id] = []

		targets = self._probes[probe_id]

		if target_key not in targets:
			targets.append(target_key)

		return True
	
	def get_probes(self) -> Dict[str, List[ConnectionKey]]:
		"""Return the probe-to-target mapping dictionary."""
		return self._probes
	
	def delete_probe(self, probe_id: str) -> bool:
		"""Remove a probe and its stored value.

		Args:
			probe_id: The name of the probe to delete.

		Returns:
			True if the probe was deleted.

		Raises:
			ValueError: If the probe does not exist.
		"""
		if probe_id not in self._probes:
			raise ValueError("Probe does not exist")
		
		self._probes.pop(probe_id, None)
		self._probe_map.pop(probe_id, None)

		return True
	
	def set_probes(self, probe_map: Dict[str, Optional[bool]]) -> None:
		"""Set one or more probe values and recompute the circuit.

		Only probes that already exist in the circuit are updated; unknown
		keys are silently ignored.

		Args:
			probe_map: A dictionary mapping probe names to boolean values.

		Raises:
			ValueError: If *probe_map* is empty or None.
		"""
		if not probe_map:
			raise ValueError("Probe map cannot be empty")
		
		for k, v in probe_map.items():
			if k in self._probe_map:
				self._probe_map[k] = v

	def add_scope(self, scope_id: str, node_id: str, index: IndexType = 0) -> bool:
		"""Register a named external output (scope) that reads from a node.

		Scopes let external code observe a specific output slot of an
		internal node without directly accessing the node.

		Args:
			scope_id: A string name for the scope (e.g. "OUT").
			node_id: The ID of the internal node to observe.
			index: The output index on the target node.

		Returns:
			True after the scope is registered.
		"""
		self._scopes[scope_id] = (node_id, index)

		return True

	def get_scopes(self) -> Dict[str, Tuple[str, IndexType]]:
		"""Return the scope-to-(node, index) mapping dictionary."""
		return self._scopes
	
	def delete_scope(self, scope_id: str) -> None:
		"""Remove a scope by its ID.

		Args:
			scope_id: The name of the scope to delete.
		"""
		if scope_id in self._scopes:
			self._scopes.pop(scope_id, None) 

	def get_scope_output(self) -> Dict[str, Optional[bool]]:
		"""Read the current output value for every registered scope.

		For each scope, looks up the referenced node and extracts the value
		at the specified output index. Sub-circuits are queried via their
		own ``get_scope_output`` method.

		Returns:
			A dictionary mapping scope names to their current boolean values
			(or None if the value is unavailable).
		"""
		results = {}

		for scope_id in self._scopes:
			[node_id, index] = self._scopes[scope_id]

			if node_id in self._nodes:
				is_circuit_node = self._nodes[node_id]._is_circuit()

				node_output = self._nodes[node_id].get_scope_output() if is_circuit_node else self._nodes[node_id].get_output()

				if is_circuit_node:
					results[scope_id] = node_output[index]
				else:
					results[scope_id] = node_output[index] if len(node_output) > index else None
			else:
				results[scope_id] = None

		return results

	def to_config(self) -> "CircuitConfig":
		"""Serialize this circuit into a CircuitConfig.

		Recursively serializes all child nodes (gates and sub-circuits),
		connections, probes, and scopes into a portable config object.

		Returns:
			A CircuitConfig snapshot of the circuit's current state.
		"""
		node_configs: List[Union[GateConfig, CircuitConfig]] = []

		for node in self._nodes.values():
			if node._is_circuit():
				node_configs.append(node.to_config())
			else:
				node_configs.append(node.to_config())

		connections: Dict[str, List[List]] = {}
		for source_key, target_keys in self._connections.items():
			key_str = f"{source_key[0]}:{source_key[1]}"
			connections[key_str] = [[t[0], t[1]] for t in target_keys]

		probes: Dict[str, List[List]] = {}
		for probe_id, target_keys in self._probes.items():
			probes[probe_id] = [[t[0], t[1]] for t in target_keys]

		scopes: Dict[str, List] = {}
		for scope_id, (node_id, index) in self._scopes.items():
			scopes[scope_id] = [node_id, index]

		return CircuitConfig(
			cid=self._cid,
			name=self._name,
			nodes=node_configs,
			connections=connections,
			probes=probes,
			scopes=scopes,
		)

	@classmethod
	def from_config(cls, config: Union["CircuitConfig", dict]) -> "Circuit":
		"""Reconstruct a Circuit from a CircuitConfig or a plain dictionary.

		Recursively rebuilds all child nodes (gates and sub-circuits),
		re-establishes connections, probes, and scopes.

		Args:
			config: A CircuitConfig (or dict with the same keys) containing
				the circuit's persisted state.

		Returns:
			A new Circuit instance matching the config's topology.

		Raises:
			ValueError: If a node config contains an unknown operation.
		"""
		if isinstance(config, dict):
			config = CircuitConfig(
				cid=config["cid"],
				name=config["name"],
				nodes=config["nodes"],
				connections=config["connections"],
				probes=config["probes"],
				scopes=config["scopes"],
			)

		circuit = cls(name=config.name)
		circuit._cid = config.cid

		# Rebuild nodes
		node_map: Dict[str, Union[Gate, "Circuit"]] = {}
		for node_config in config.nodes:
			# Detect if it's a circuit (has 'cid' key) or a gate (has 'gid' key)
			is_circuit_node = False
			if isinstance(node_config, CircuitConfig):
				is_circuit_node = True
			elif isinstance(node_config, dict) and "cid" in node_config:
				is_circuit_node = True

			if is_circuit_node:
				node = cls.from_config(node_config)
			else:
				node = Gate.from_config(node_config)
			node_map[node.get_id()] = node
			circuit.add_node(node)

		# Rebuild connections
		for source_key_str, target_list in config.connections.items():
			source_id, source_idx_str = source_key_str.rsplit(":", 1)
			# Restore index type (int if numeric, else str)
			source_idx: IndexType = int(source_idx_str) if source_idx_str.isdigit() else source_idx_str

			for target_pair in target_list:
				target_id, target_idx = target_pair[0], target_pair[1]
				circuit._create_connection(source_id, target_id, source_idx, target_idx)

		# Rebuild probes
		for probe_id, target_list in config.probes.items():
			for target_pair in target_list:
				target_id, index = target_pair[0], target_pair[1]
				circuit._probe_map[probe_id] = None
				if probe_id not in circuit._probes:
					circuit._probes[probe_id] = []
				target_key = (target_id, index)
				if target_key not in circuit._probes[probe_id]:
					circuit._probes[probe_id].append(target_key)

		# Rebuild scopes
		for scope_id, pair in config.scopes.items():
			node_id, index = pair[0], pair[1]
			circuit._scopes[scope_id] = (node_id, index)

		return circuit