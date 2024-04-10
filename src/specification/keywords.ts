/**
 * The kewords that control mutations.
 */
export enum MutationKeywords {
  /**
   * A boolean flag used to indicate that the resource can be created in the API, defaults to true.
   */
  Createable = "createable",
  /**
   * A boolean flag used to indicate that the resource can be updated in the API, defaults to true.
   */
  Editable = "editable",
  /**
   * A boolean flag used to indicate that the resource can be deleted in the API, defaults to true.
   */
  Deleteable = "deleteable",
}
