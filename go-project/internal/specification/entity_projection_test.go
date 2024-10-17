package specification

import (
	"testing"

	"github.com/stretchr/testify/suite"
	"gopkg.in/yaml.v3"
)

type EntityProjectionSuite struct {
	suite.Suite
}

func TestEntityProjectionSuite(t *testing.T) {
	suite.Run(t, &EntityProjectionSuite{})
}

func (s *EntityProjectionSuite) TestUnmarshalEntityName() {
	var e EntityProjection

	input := "entityName"
	s.Require().NoError(yaml.Unmarshal([]byte(input), &e))
	s.Assert().Equal("entityName", e.EntityName())
}

func (s *EntityProjectionSuite) TestUnmarshalEntityProjection() {
	var e EntityProjection

	input := `
entityName:
  - id
  - name
  - description`
	s.Require().NoError(yaml.Unmarshal([]byte(input), &e))
	s.Assert().Equal("entityName", e.EntityName())
}

func (s *EntityProjectionSuite) TestUnmarshalNestedEntityProjection() {
	var e EntityProjection

	input := `
entityName:
  - id
  - name
  - description
  - child:
    - id
    - name
  `
	s.Require().NoError(yaml.Unmarshal([]byte(input), &e))
	s.Assert().Equal("entityName", e.EntityName())
}
