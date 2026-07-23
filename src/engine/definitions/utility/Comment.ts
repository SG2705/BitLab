import { GATE_CATEGORY_UTILITY, GATE_TYPE_COMMENT } from "../../constants";
import { evalComment } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { cb } from "../helpers";

export const Comment: ComponentDefinition[] = [
  cb({
    type: GATE_TYPE_COMMENT,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: 0,
    outputs: 0,
    width: 120,
    height: 34,
    isAnnotation: true,
    evaluate: evalComment,
  }),
];

export default Comment;
