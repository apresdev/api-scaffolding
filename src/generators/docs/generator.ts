import Handlebars = require("handlebars");

import { HandlebarsGenerator } from "../base/handlebars-generator";

import { toPascalCase } from "../../common";
import { Cardinality, Relationship, RelationshipName, RelationshipType } from "../../specification";

Handlebars.registerHelper("edgeDescription", function (relationship: Relationship) {
  if (!relationship.summary && !relationship.via) {
    return "";
  }

  let edgeDescription = " : ";

  if (relationship.via) {
    edgeDescription += "via ";
    edgeDescription += Array.isArray(relationship.via)
      ? relationship.via.map((name: RelationshipName) => toPascalCase(name)).join(" and ")
      : toPascalCase(relationship.via as string);
  } else {
    edgeDescription += relationship.summary;
  }

  return edgeDescription;
});

Handlebars.registerHelper("renderERCardinality", function (relationship: Relationship) {
  switch (relationship.cardinality) {
    case Cardinality.MANY_TO_MANY: {
      return `}|-${relationship.via ? "-" : ""}-|{`;
    }
    case Cardinality.MANY_TO_ONE: {
      return `}|-${relationship.via ? "-" : ""}-||`;
    }
    case Cardinality.ONE_TO_MANY: {
      return `||-${relationship.via ? "-" : ""}-|{`;
    }
    case Cardinality.ONE_TO_ONE: {
      return `||-${relationship.via ? "-" : ""}-||`;
    }
  }
});

Handlebars.registerHelper("relationshipSymbol", function (type: RelationshipType) {
  switch (type) {
    case RelationshipType.COMPOSITION: {
      return "*--";
    }
    case RelationshipType.ASSOCIATION:
    case RelationshipType.AGGREGATION: {
      return "o--";
    }
    default: {
      throw new Error(`unsupported relationship type: ${type}`);
    }
  }
});

Handlebars.registerHelper("fromCardinality", function (cardinality: Cardinality) {
  if (Cardinality.isFromMany(cardinality)) {
    return "many";
  }

  return "1";
});

Handlebars.registerHelper("toCardinality", function (cardinality: Cardinality) {
  if (Cardinality.isToMany(cardinality)) {
    return "many";
  }

  return "1";
});

export class EntityRelationshipGenerator extends HandlebarsGenerator {
  constructor() {
    super(["docs/er.puml", "docs/class.puml"]);
  }
}
