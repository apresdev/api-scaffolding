import { Field, id, Interface } from ".";

export const NodeInterface: Interface = {
  name: "Node",
  fields: [
    {
      name: "id",
      type: id(),
    } as Field,
  ],
};
