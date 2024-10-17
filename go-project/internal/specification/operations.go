package specification

type Operations struct {
	// A declaration of all mutations provided by the service.
	Mutations Mutations `yaml:"mutations"`

	// A collection of projection fragments. Used when multiple APIs return similar data.
	Fragments Fragments `yaml:"fragments,omitempty"`

	// A declaration of all queries provided by the service.
	Queries Queries `yaml:"queries"`
}
