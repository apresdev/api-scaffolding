package specification

import (
	"regexp"
	"strconv"
	"strings"

	"gopkg.in/yaml.v3"
)

type Version struct {
	Major    int
	Minor    int
	Revision int
}

var semVerPattern, _ = regexp.Compile(`^\d+\.\d+\.\d+$`)

// func (v *Version) UnmarshalYAML(unmarshal func(interface{}) error) error {
// 	var s string
// 	if err := unmarshal(&s); err != nil {
// 		return err
// 	}

// 	if !semVerPattern.MatchString(s) {
// 		return fmt.Errorf("version must be of the form major.minor.revision ")
// 	}

// 	parts := strings.Split(s, ".")
// 	v.Major, _ = strconv.Atoi(parts[0])
// 	v.Minor, _ = strconv.Atoi(parts[1])
// 	v.Revision, _ = strconv.Atoi(parts[2])

// 	return nil
// }

func (v *Version) UnmarshalYAML(node *yaml.Node) error {
	var s string

	if err := node.Decode(&s); err != nil {
		return &SpecificationError{
			message: err.Error(),
			node:    node,
		}
	}

	if !semVerPattern.MatchString(s) {
		return &SpecificationError{
			message: "version must be of the form [major.minor.revision]",
			node:    node,
		}
	}

	parts := strings.Split(s, ".")
	v.Major, _ = strconv.Atoi(parts[0])
	v.Minor, _ = strconv.Atoi(parts[1])
	v.Revision, _ = strconv.Atoi(parts[2])

	return nil
}
