package specification

import "gopkg.in/yaml.v3"

type SpecificationError struct {
	message string
	node    *yaml.Node
}

func (s *SpecificationError) Error() string {
	return s.message
}

func (s *SpecificationError) Line() int {
	return s.node.Line
}

func (s *SpecificationError) Column() int {
	return s.node.Column
}
