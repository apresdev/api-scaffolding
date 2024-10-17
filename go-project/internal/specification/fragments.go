package specification

type Fragments []Fragment

type FragmentName string
type Fragment struct {
	Name FragmentName     `yaml:"name"`
	On   EntityProjection `yaml:"on"`
}
