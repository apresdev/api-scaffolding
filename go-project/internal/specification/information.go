package specification

/**
 * The object provides metadata about the API. The metadata MAY be used by the clients if needed, and MAY be presented in editing or
 * documentation generation tools for convenience.
 */
type Information struct {
	// The title of the API.
	Title string `yaml:"title"`

	// The version of the OpenAPI document (which is distinct from the OpenAPI Specification version or the API implementation version).
	Version Version `yaml:"version"`

	// The base URL for the service.
	BaseUrl string `yaml:"baseUrl"`

	// A short description of the API. CommonMark syntax MAY be used for rich text representation.
	Description string `yaml:"description"`

	// The contact information for the exposed API.
	Contact ContactInformation `yaml:"contact"`
}
