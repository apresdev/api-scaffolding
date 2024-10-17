package specification

import "fmt"

type EntityProjections []EntityProjection

type EntityProjection struct {
	name       string
	projection map[EntityName][]EntityProjection
}

func (e EntityProjection) EntityName() string {
	return e.name
}

func (e EntityProjection) ProjectAll() bool {
	return len(e.projection) == 0
}

func (e *EntityProjection) UnmarshalYAML(unmarshal func(interface{}) error) error {
	var v interface{}
	if err := unmarshal(&v); err != nil {
		return err
	}

	temp, err := e.unmarshalInterface(v)
	if err != nil {
		return err
	}

	e.name = temp.name
	e.projection = temp.projection

	return nil
}

func (e *EntityProjection) unmarshalInterface(v interface{}) (EntityProjection, error) {
	switch typed := v.(type) {
	case string:
		return e.unmarshalString(typed), nil
	case map[string]interface{}:
		return e.unmarshalMap(typed)
	}

	return EntityProjection{}, fmt.Errorf("entity projection must either be string or map")
}

func (e *EntityProjection) unmarshalString(name string) EntityProjection {
	return EntityProjection{
		name: name,
	}
}

func (e *EntityProjection) unmarshalMap(projection map[string]interface{}) (EntityProjection, error) {
	if len(projection) != 1 {
		return EntityProjection{}, fmt.Errorf("projections must project only one entity")
	}

	result := EntityProjection{
		projection: map[EntityName][]EntityProjection{},
	}

	for k, v := range projection {
		var err error
		result.name = k

		switch typed := v.(type) {
		case []interface{}:
			result.projection[EntityName(k)], err = e.unmarshalArray(typed)
			if err != nil {
				return EntityProjection{}, err
			}
		default:
			return EntityProjection{}, fmt.Errorf("entity projection must project an array")
		}
	}

	return result, nil
}

func (e *EntityProjection) unmarshalArray(projections []interface{}) ([]EntityProjection, error) {
	result := make([]EntityProjection, len(projections))
	for i, projection := range projections {
		var err error

		result[i], err = e.unmarshalInterface(projection)
		if err != nil {
			return nil, err
		}
	}

	return result, nil
}
