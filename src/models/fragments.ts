import { SchemaRegistry } from ".";
import { Joins } from "../specification/joins";

export class Fragments {
  private constructor() {}

  public static entity(entity: string, schemaRegistry: SchemaRegistry) {
    const fragment = schemaRegistry.getFragment(entity);
    if (fragment) {
      return Joins.viaFrom(fragment.on);
    }

    return entity;
  }
}
