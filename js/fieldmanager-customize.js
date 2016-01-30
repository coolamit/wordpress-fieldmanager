/* global document, jQuery, wp, _ */
/**
 * Integrate Fieldmanager and the Customizer.
 *
 * @param {function} $ jQuery
 * @param {function} api wp.customize API.
 * @param {function} _ Underscore
 */
(function( $, api, _ ) {
	'use strict';

	/**
	 * Debounce interval between looking for changes after a 'keyup'.
	 *
	 * @type {Number}
	 */
	var keyupDebounceInterval = 500;

	/**
	 * Fires when an .fm-element input triggers a 'change' event.
	 *
	 * @param {Event} e Event object.
	 */
	var onFmElementChange = function( e ) {
		reserializeControlsContainingElement( e.target );
	};

	/**
	 * Fires when an .fm-element input triggers a 'keyup' event.
	 *
	 * @param {Event} e Event object.
	 */
	var onFmElementKeyup = function( e ) {
		var $target = $( e.target );

		// Ignore [Escape] and [Enter].
		if ( 27 === e.keyCode || 13 === e.keyCode ) {
			return;
		}

		if ( $target.hasClass( 'fm-autocomplete' ) ) {
			// Update an autocomplete setting object when the input's text is deleted.
			if ( '' === $target.val() ) {
				// See fm.autocomplete.enable_autocomplete() for this tree.
				// @todo Risky? Autocomplete hidden fields don't typically get set to value="".
				$target.siblings( 'input[type=hidden]' ).first().val( '' );

			/*
			 * Don't update when typing into the autocomplete input. The hidden
			 * field actually contains the value and is handled onFmElementChange().
			 */
			} else {
				return;
			}
		}

		reserializeControlsContainingElement( e.target );
	};

	/**
	 * Fires when a Fieldmanager object is dropped while sorting.
	 *
	 * @param {Event} e Event object.
	 * @param {Element} el The sorted element.
	 */
	var onFmSortableDrop = function ( e, el ) {
		reserializeControlsContainingElement( el );
	};

	/**
	 * Fires when Fieldmanager adds a new element in a repeatable field.
	 *
	 * @param {Event} e Event object.
	 */
	var onFmAddedElement = function( e ) {
		reserializeControlsContainingElement( e.target );
	};

	/**
	 * Fires when an item is selected and previewed in a Fieldmanager media field.
	 *
	 * @param {Event} e Event object.
	 * @param {jQuery} $wrapper .media-wrapper jQuery object.
	 * @param {Object} attachment Attachment attributes.
	 * @param {Object} wp Global WordPress JS API.
	 */
	var onFieldmanagerMediaPreview = function( e, $wrapper, attachment, wp ) {
		reserializeControlsContainingElement( e.target );
	};

	/**
	 * Fires after TinyMCE initializes in a Fieldmanager richtext field.
	 *
	 * @param {Event} e Event object.
	 * @param {Object} ed TinyMCE instance.
	 */
	var onFmRichtextInit = function( e, ed ) {
		ed.on( 'keyup AddUndo', _.debounce( function () {
			ed.save();
			reserializeControlsContainingElement( document.getElementById( ed.id ) );
		}, keyupDebounceInterval ) );
	};

	/**
	 * Fires after clicking the "Remove" link of a Fieldmanager media field.
	 *
	 * @param {Event} e Event object.
	 */
	 var onFmMediaRemoveClick = function ( e ) {
		// The control no longer contains the element, so reserialize all of them.
		reserializeEachControl();
	 };

	 /**
	  * Fires after clicking the "Remove" link of a Fieldmanager repeatable field.
	  *
	  * @param {Event} e Event object.
	  */
	 var onFmjsRemoveClick = function ( e ) {
		// The control no longer contains the element, so reserialize all of them.
		reserializeEachControl();
	 };

	/**
	 * Set the values of all Fieldmanager controls.
	 */
	var reserializeEachControl = function() {
		api.control.each( reserializeControl );
	};

	/**
	 * Set the value of any Fieldmanager control with a given element in its container.
	 *
	 * @param {Element} el Element to look for.
	 */
	var reserializeControlsContainingElement = function( el ) {
		api.control.each(function( control ) {
			if ( control.container.find( el ).length ) {
				reserializeControl( control );
			}
		});
	};

	/**
	 * Set a Fieldmanager control to its form values.
	 *
	 * @param {Object} control Customizer Control object.
	 */
	var reserializeControl = function ( control ) {
		var $element;
		var serialized;
		var value;

		if ( 'fieldmanager' !== control.params.type ) {
			return;
		}

		$element = control.container.find( '.fm-element' );

		if ( $.serializeJSON ) {
			serialized = $element.serializeJSON();
			value = serialized[ control.id ];
		} else {
			value = $element.serialize();
		}

		control.setting.set( value );
	};

	/**
	 * Fires when a Customizer Section expands.
	 *
	 * @param {Object} section Customizer Section object.
	 */
	var onSectionExpanded = function( section ) {
		/*
		 * Trigger a Fieldmanager event when a Customizer section expands.
		 *
		 * We bind to sections whether or not they have FM controls in case a
		 * control is added dynamically.
		 */
		$( document ).trigger( 'fm_customizer_control_section_expanded' );

		if ( fm.richtextarea ) {
			fm.richtextarea.add_rte_to_visible_textareas();
		}

		/*
		 * Reserialize any Fieldmanager controls in this section with null
		 * values. We assume null indicates nothing has been saved to the
		 * database, so we want to make sure default values take effect in the
		 * preview and are submitted on save as they would be in other contexts.
		 */
		_.each( section.controls(), function ( control ) {
			if (
				control.settings.default &&
				null === control.settings.default.get()
			) {
				reserializeControl( control );
			}
		});
	};

	/**
	 * Fires when the Customizer is loaded.
	 */
	var ready = function() {
		var $document = $( document );

		/*
		 * We debounce() most keyup events to avoid refreshing the Customizer
		 * preview every single time the user types a letter. But typing into
		 * the autocomplete input does not itself trigger a refresh -- the only
		 * time it should affect the preview is when removing an autocomplete
		 * selection. We allow that to occur normally.
		 */
		$document.on( 'keyup', '.fm-element:not(.fm-autocomplete)', _.debounce( onFmElementKeyup, keyupDebounceInterval ) );
		$document.on( 'keyup', '.fm-autocomplete', onFmElementKeyup );

		$document.on( 'change', '.fm-element', onFmElementChange );
		$document.on( 'click', '.fm-media-remove', onFmMediaRemoveClick );
		$document.on( 'click', '.fmjs-remove', onFmjsRemoveClick );
		$document.on( 'fm_sortable_drop', onFmSortableDrop );
		$document.on( 'fieldmanager_media_preview', onFieldmanagerMediaPreview );
		$document.on( 'fm_richtext_init', onFmRichtextInit );
	};

	/**
	 * Fires when a Customizer request to save values fails.
	 *
	 * @return {Mixed} response The response from the server.
	 */
	var error = function( response ) {
		if ( ! response.fieldmanager ) {
			return;
		}

		// There isn't yet an official way to signal a save failure, but this mimics the AYS prompt.
		alert( response.fieldmanager );
	};

	/**
	 * Fires when a Customizer Section is added.
	 *
	 * @param {Object} section Customizer Section object.
	 */
	var addSection = function( section ) {
		// It would be more efficient to do this only when adding an FM control to a section.
		section.container.bind( 'expanded', function () {
			onSectionExpanded( section );
		} );
	};

	if ( typeof api !== 'undefined' ) {
		api.bind( 'ready', ready );
		api.bind( 'error', error );
		api.section.bind( 'add', addSection );
	}
})( jQuery, wp.customize, _ );