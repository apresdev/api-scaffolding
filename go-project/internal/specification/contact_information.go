package specification

// ContactInformation contains the contact information for the exposed API.
type ContactInformation struct {
	// The identifying name of the contact person/organization
	Name string `yaml:"name"`

	// The URL pointing to the contact information. MUST be in the format of a URL.
	Url string `yaml:"url"`

	// The email address of the contact person/organization. MUST be in the format of an email address.
	Email string `yaml:"email"`
}
