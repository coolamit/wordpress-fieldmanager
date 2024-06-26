<?php
/**
 * Class file for Fieldmanager_Password
 *
 * @package Fieldmanager
 */

/**
 * Text field which hides the user input.
 *
 * This field submits plain text.
 */
class Fieldmanager_Password extends Fieldmanager_Field {

	/**
	 * Override $field_class.
	 *
	 * @var string
	 */
	public $field_class = 'password';

	/**
	 * Override the input type.
	 *
	 * @var string
	 */
	public $input_type = 'password';

	/**
	 * Override constructor to set default size.
	 *
	 * @param string|array $label   The field label. A provided string sets $options['label'], while an array sets $options, overriding any existing data in $options.
	 * @param array        $options The field options.
	 */
	public function __construct( $label = '', $options = array() ) {
		$this->attributes = array(
			'size' => '50',
		);
		parent::__construct( $label, $options );
	}

}
