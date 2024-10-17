package specification

type Mutations []Mutation

type Mutation struct {
	// The name of the entity to mutate.
	Entity EntityName `yaml:"entity"`

	// The optional operation tag.
	tag string `yaml:"entity,omitempty"`
}
