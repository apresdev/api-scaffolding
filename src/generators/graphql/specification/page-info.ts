import { bool, id, nonNull, Type } from ".";

export const PageInfoType: Type = {
  name: "PageInfo",
  fields: [
    {
      name: "startCursor",
      type: id(),
    },
    {
      name: "endCursor",
      type: id(),
    },
    {
      name: "hasPreviousPage",
      type: nonNull(bool()),
    },
    {
      name: "hasNextPage",
      type: nonNull(bool()),
    },
  ],
};
