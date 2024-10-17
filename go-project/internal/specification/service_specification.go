package specification

// ServiceSpecification represents the specification for the service.
// Defines all of the entities and entity relationships in the service.
// Defines all query and mutation operations provided by the service.
type ServiceSpecification struct {
	/**
	 * The Apres API specification version.
	 */
	ApresApi Version `yaml:"apresApi"`

	/**
	* The object provides metadata about the API. The metadata MAY be used by the clients if needed, and MAY be presented in editing or
	* documentation generation tools for convenience.
	 */
	Info Information `yaml:"info"`

	/**
	* The collection of entities managed by the service.
	 */
	Entities []EntityName `yaml:"entities"`

	/**
	* The mutation and query operations provided by the service.
	 */
	Operations Operations `yaml:"operations"`
}
