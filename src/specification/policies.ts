import { IncludeDirective } from ".";

/**
 * A collection of policies.
 */
export type Policies = Array<Policy | IncludeDirective>;

/**
 * A policy document.
 *
 * Defines a policy that either explicity allows or specifically denys permissions to perform one or more actions on one or more resources.
 */
export interface Policy {
  /**
   * The name of the policy
   */
  name: string;

  /**
   * A long human readable description of the policy.
   */
  description?: string;

  /**
   * The effect of the policy (i.e. allow or deny)
   */
  effect: Effect;

  /**
   * Filters which subjects the policy applies to.
   */
  subject?: SubjectSelection | SubjectSelections;

  /**
   * Filters which actions the policy applies to.
   */
  action?: ActionSelection | ActionSelections;

  /**
   * Filters which resources the policy applies to.
   */
  resource?: ResourceSelection | ResourceSelections;

  /**
   * The conditional modifiers that affect when the policy applies.
   */
  condition?: Condition | Condition[];
}

/**
 * The enumerated set of supported policy effects.
 *
 * Can be either "allow" or "deny".
 */
export type Effect = "allow" | "deny";

/**
 * A collection of subject selections.
 *
 * Must contain at least on selection, if specified.
 *
 * @minItems 1
 */
export type SubjectSelections = SubjectSelection[];

/**
 * A selector that specifies who the subject is that is invoking the action on the given resource.
 *
 * May contain wildcards.
 *
 * @minLength 1
 */
export type SubjectSelection = string;

/**
 * A collection of resource selections.
 *
 * Must contain at least on selection, if specified.
 *
 * @minItems 1
 */
export type ResourceSelections = ResourceSelection[];

/**
 * A selector that specifies the resource for which the action is being applied to.
 *
 * May contain wildcards.
 *
 * @minLength 1.
 */
export type ResourceSelection = string;

/**
 * A collection of resource selections.
 *
 * Must contain at least on selection, if specified.
 *
 * @minItems 1
 */
export type ActionSelections = ActionSelection[];

/**
 * A selector that specifies the resource for which the action is being applied to.
 *
 * May contain wildcards.
 *
 * @minLength 1
 */
export type ActionSelection = string;

/**
 * A collection of role names.
 *
 * Must have at least one role name if specified.
 *
 * @minItems 1
 */
export type RoleNames = RoleName[];

/**
 * The name of a role a subject may have assigned to them.
 */
export type RoleName = string;

/**
 * A condition the controls if the policy should be applied.
 */
export interface Condition {
  /**
   * Adds a condition based on the subject.
   */
  subject?: SubjectCondition;
}

/**
 * A condition based on the subject attempting to perform the action on the given resource.
 */
export interface SubjectCondition {
  /**
   * Adds a condition that requires the the subject has a role or one of a given set of roles.
   *
   * This is the primary condition used for Role-Based-Access control.  This is useful when the collection of role names are known at
   * design time (i.e. the roles are system defined not user defined.)
   */
  hasRole?: RoleName | RoleNames;

  /**
   * Adds a condition that matches the current subject's identifier.
   *
   *
   */
  id?: SubjectIdCondition;
}

/**
 * Creates a condition based on the subject's identifier.
 */
export interface SubjectIdCondition {
  /**
   * Creates a condition to check if the subject's identifier is "in" a specific collection.
   */
  in?: InCondition;
}

/**
 * A condition to check if the left-hand-side is "in" a specific collection.
 */
export interface InCondition {
  /**
   * Defines the right-hand-side collection as a poperty of the target resource.
   */
  resource?: string;
}
