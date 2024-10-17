package specification

import (
	"testing"

	"github.com/stretchr/testify/suite"
	"gopkg.in/yaml.v3"
)

type VersionSuite struct {
	suite.Suite
}

func TestVersionSuite(t *testing.T) {
	suite.Run(t, &VersionSuite{})
}

func (s *VersionSuite) TestParseYaml() {
	var v Version

	input := "1.2.3"

	s.Require().NoError(yaml.Unmarshal([]byte(input), &v))
	s.Assert().Equal(1, v.Major)
	s.Assert().Equal(2, v.Minor)
	s.Assert().Equal(3, v.Revision)
}

func (s *VersionSuite) TestParsingErrors() {
	type test struct {
		name  string
		input string
	}

	tests := []test{
		{"too few", "1.2"},
		{"too many", "1.2.3.4"},
		{"non-int major", "a.2.3"},
		{"non-int minor", "1.b.3"},
		{"non-int revision", "1.2.c"},
		{"neg-int major", "-1.2.3"},
		{"neg-int minor", "1.-2.3"},
		{"neg-int revision", "1.2.-3"},
	}

	for _, tc := range tests {
		s.T().Run(
			tc.name,
			func(t *testing.T) {
				var v Version
				err := yaml.Unmarshal([]byte(tc.input), &v)
				s.Require().Error(err)
			},
		)
	}
}
