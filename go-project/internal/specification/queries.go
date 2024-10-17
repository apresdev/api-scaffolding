package specification

type Queries []Query

type Query struct {
	// The name of the query.
	Name string `yaml:"name,omitempty"`

	// A short summary of what the query does.
	Summary string `yaml:"summary,omitempty"`

	//* A verbose explanation of the query behavior. CommonMark syntax MAY be used for rich text representation.
	Description string `yaml:"description,omitempty"`

	// The optional operation tag.
	Tag string `yaml:"tag,omitempty"`

	// The collection of fields that may be used for server side filtering.
	FilterableBy EntityProjections `yaml:"filterableBy,omitempty"`

	// The collection of fields that may be used for server side sorting.
	SortableBy EntityProjections `yaml:"sortableBy,omitempty"`
}

type ListQuery struct {
	Query
	FindAll EntityProjection `yaml:"findAll"`
}

type RetrieveQuery struct {
	Query
	FindOne EntityProjection `yaml:"findOne"`
}

type SearchQuery struct {
	Query
	Search EntityProjection `yaml:"search"`
}

// type NamedQuery struct {
// 	Query
// }
