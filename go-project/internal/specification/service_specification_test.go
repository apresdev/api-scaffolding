package specification

import (
	"testing"

	"github.com/stretchr/testify/suite"
	"gopkg.in/yaml.v3"
)

type ServiceSpecificationSuite struct {
	suite.Suite
}

func TestServiceSpecificationSuite(t *testing.T) {
	suite.Run(t, &ServiceSpecificationSuite{})
}

func (s *ServiceSpecificationSuite) TestYamlParsing() {
	var input = `
apresApi: 1.0.0
info:
  title: Test API
  version: 1.0.0
  baseUrl: https://test.io/api/v2/
  description: The backend API for the test customer dashboard.
  contact:
    email: developers@test.io

entities:
  - widget
  - factory

operations:
  mutations:
    - entity: widget
    - entity: factory
`
	var spec ServiceSpecification
	err := yaml.Unmarshal([]byte(input), &spec)
	s.Require().NoError(err)

	// Specification Version
	s.Assert().Equal(1, spec.ApresApi.Major)
	s.Assert().Equal(0, spec.ApresApi.Minor)
	s.Assert().Equal(0, spec.ApresApi.Revision)

	// Info Version
	s.Assert().Equal("Test API", spec.Info.Title)
	s.Assert().Equal(1, spec.Info.Version.Major)
	s.Assert().Equal(0, spec.Info.Version.Minor)
	s.Assert().Equal(0, spec.Info.Version.Revision)
	s.Assert().Equal("https://test.io/api/v2/", spec.Info.BaseUrl)
	s.Assert().Equal("The backend API for the test customer dashboard.", spec.Info.Description)
	s.Assert().Equal("developers@test.io", spec.Info.Contact.Email)

	// Entities
	s.Assert().Equal([]EntityName{"widget", "factory"}, spec.Entities)
}
