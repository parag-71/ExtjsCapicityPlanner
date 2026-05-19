/*
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: ControlHeader.js
 */
Ext.define('LeankorApp.view.ControlHeader', {
	extend : 'Ext.panel.Header',
	xtype : 'controlheader',
	title : 'Gantt Board',
	cls : 'lk-control-header',
	layout : {
		type : 'hbox',
		align : 'middle',
		pack : 'start'
	},
	focusableContainer : false,
	//height : 60,
	//split  : true,
	initComponent : function () {
		var me = this;

		Ext.getStore('monthStore').setData([
			{	
				"name":Locale.LocaleName.Weeks, 
				"value":"weekAndMonth"
			},{
				"name": Locale.LocaleName.OneWeek,
				"value": "weekAndHour"
			}, {
				"name": Locale.LocaleName.OneMonth,
				"value": "weekAndDayLetter4"
			}, {
				"name": Locale.LocaleName.TwoMonths,
				"value": "weekAndDayLetter8"
			}, {
				"name": Locale.LocaleName.ThreeMonths,
				"value": "weekAndDayLetter12"
			}, {
				"name": Locale.LocaleName.SixMonths,
				"value": "weekAndDayLetter"
			}, {
				"name": Locale.LocaleName.OneYear,
				"value": "monthAndYear1"
			}, {
				"name": Locale.LocaleName.TwoYears,
				"value": "monthAndYear2"
			}, {
				"name": Locale.LocaleName.ThreeYears,
				"value": "monthAndYear3"
			}
		]);
		Ext.getStore('settingsStore').loadData([	
			{"name": Locale.LocaleName.ZoomToFit, "value":"Zoom to Fit" , id : 1},
			{"name": Locale.LocaleName.Today, "value":"Today", id : 6},
			{"name": Locale.LocaleName.Print, "value":"Print", id : 2}
		]);
		Ext.getStore('departmentOption').loadData([{
			"name": Ext.htmlEncode(Locale.LocaleName.ByResourceTypes),
			"value": Ext.htmlEncode(Locale.LocaleName.ByResourceTypes),
			id: 1
		}          
		]);
		this.tools = [{
				xtype : 'combo',
				store : 'departmentOption',
				queryMode : 'local',
				valueField : 'value',
				cls : 'combo-custom-cls-period',
				forceSelection : false,
				editable : false,
				listConfig : {
					width : 190,
					minWidth : 190,					
				},				
				emptyText : Locale.LocaleName.View,
				reference : 'departmentFilter',
				tpl : Ext.create('Ext.XTemplate',
					'<ul class="x-list-plain"><tpl for=".">',
					'<li role="option" class="x-boundlist-item">{name}</li>',
					'</tpl></ul>')

			}, {
				xtype : 'combo',
				store : 'folderProjectTree',
				valueField : 'value',
				editable : false,
				cls : 'combo-custom-cls-period',
				emptyText : Locale.LocaleName.Projects,
				reference : 'projectFilter',
				// Template for the dropdown menu.
				// Note the use of the "x-list-plain" and "x-boundlist-item" class,
				// this is required to make the items selectable.
				// tpl: Ext.create('Ext.XTemplate',
				// '<ul class="x-list-plain"><tpl for=".">',
				// '<li role="option" class="x-boundlist-item"><input type="checkbox" name="group1"/> {name}</li>',
				// '</tpl></ul>'
				// )
				// listeners : {
					// expand : function (e1) {
						// LeankorApp.Gantt.getView().setLoading('Loading project list...');
						
					// }
				// }
			}, {
				xtype : 'button',

				text: '<span style = "font: 300 13px/17px Open Sans, Helvetica Neue, helvetica, arial, verdana, sans-serif;font-weight: normal;">'+Ext.htmlEncode(Locale.LocaleName.PreviousTimespan)+'<span>',

				tooltip: Ext.htmlEncode(Locale.LocaleName.PreviousTimespan),
				reference : 'shiftPrevious',
				iconCls : 'icon-previous',
				cls : 'toolbar-custom-btn',
				text:Ext.htmlEncode(Locale.LocaleName.PreviousTimespan)
			}, {
				xtype : 'button',

				text: '<span style = "font: 300 13px/17px Open Sans, Helvetica Neue, helvetica, arial, verdana, sans-serif;font-weight: normal;">'+Ext.htmlEncode(Locale.LocaleName.NextTimespan)+'<span>',

				tooltip: Ext.htmlEncode(Locale.LocaleName.NextTimespan),
				reference : 'shiftNext',
				iconCls : 'icon-next',
				cls : 'toolbar-custom-btn',
				text:Ext.htmlEncode(Locale.LocaleName.NextTimespan)
			}, {
				xtype : 'combo',
				store : 'viewStore',
				queryMode : 'local',
				valueField : 'value',
				cls : 'combo-custom-cls-period',
				forceSelection : false,
				editable : false,
				listConfig : {
					width : 190,
					minWidth : 190,
				},
				emptyText : Locale.LocaleName.Show,
				reference : 'viewChange',
				// Template for the dropdown menu.
				// Note the use of the "x-list-plain" and "x-boundlist-item" class,
				// this is required to make the items selectable.
				tpl : Ext.create('Ext.XTemplate',
					'<ul class="x-list-plain customulcls"><tpl for=".">',
					'<li role="option" class="x-boundlist-item"><span class="{value:htmlEncode}"></span><span class="name">{name:htmlEncode}</span></li>',
					'</tpl></ul>'),
				// tpl : Ext.create('Ext.XTemplate',
				// '<ul class="x-list-plain"><tpl for=".">',
				// '<li role="option" class="x-boundlist-item"><input type="checkbox" name="group1"/> {name}</li>',
				// '</tpl></ul>')

			},
			// '-',
			{
				xtype : 'combo',
				store : 'settingsStore',
				queryMode : 'local',
				valueField : 'value',
				cls : 'combo-custom-cls-setting',
				forceSelection : false,
				editable : false,
				listConfig : {
					width : 190,
					minWidth : 190,
					cls : 'lk-setting-combo-list'
				},
				autoSelect : false,
				reference : 'settingCheck',
				// Template for the dropdown menu.
				// Note the use of the "x-list-plain" and "x-boundlist-item" class,
				// this is required to make the items selectable.
				tpl : (Ext.urlDecode(Ext.htmlDecode(window.location.search.substring(1))).btype == 'projectgantt') ? Ext.create('Ext.XTemplate',
					'<ul class="x-list-plain"><tpl for=".">',
					'<li role="option" class="x-boundlist-item">{name:htmlEncode}</li>',
					'</tpl></ul>') : Ext.create('Ext.XTemplate',
					'<ul class="x-list-plain"><tpl for=".">',
					'<tpl if="id!=\'8\' && id!=\'9\'"><li role="option" class="x-boundlist-item">{name:htmlEncode}</li></tpl>',
					'</tpl></ul>')

			}, {
				xtype : 'combo',
				store : 'monthStore',
				queryMode : 'local',
				valueField : 'value',
				cls : 'combo-custom-cls-period',
				listConfig : {
					height: 'auto'
				},
				listConfig: {
                    width: 170,
                    minWidth: 170,
                    maxWidth: 220,
					height : 330,
					minHeight: 330,
                    maxHeight: 350,
                },
				forceSelection : false,
				editable : false,
				emptyText : Locale.LocaleName.SelectPeriod,
				reference : 'monthChange',
				// Template for the dropdown menu.
				// Note the use of the "x-list-plain" and "x-boundlist-item" class,
				// this is required to make the items selectable.
				tpl : Ext.create('Ext.XTemplate',
					'<ul class="x-list-plain radioButtonCls"><tpl for=".">',
					'<li role="option" class="x-boundlist-item"><input type="radio" name="group1"  class = "{value:htmlEncode}"/> {name:htmlEncode}</li>',
					'</tpl></ul>')

			}, {
				xtype : 'textfield',
				height : 25,
				width : 160,
				fieldLabel : '',
				reference : 'searchfilterfield',
				emptyText : Locale.LocaleName.SearchResourceTypes,
				cls: 'toolbar-custom-textfield textFieldPlaceholderCls',
				enableKeyEvents : true,
				// listeners : {
					// blur : function (field, e, eOpts) {
						// _LOG && console.log('onNewPostFieldBlur');
						// var currVal = field.getValue(),
						// newVal = Ext.htmlDecode(currVal.replace(/(<([^>]+)>)/ig, ""));
						// field.setValue(newVal);
					// }
				// }
			}, {
				xtype : 'button',
				reference : 'popOut',
				iconCls : 'icon-zoom-to-fit',
				cls : 'toolbar-custom-btn toolbar-popout-btn'
			}, {
				xtype : 'button',
				reference : 'help',
				iconCls : 'icon-help',
				cls : 'toolbar-custom-btn',
				hidden : true,
				style : 'width : 40px !important;'
			},

		];

		Ext.Array.forEach(this.tools, function (cmp) {
			if (cmp.reference)
				cmp.itemId = cmp.reference;

			if (cmp.xtype === 'combo') {
				cmp.selectOnTab = false;
			}

			cmp.focusable = true;
			cmp.tabIndex = 0;
			cmp.ariaLabel = me.getHeaderControlLabel(cmp);
			cmp.cls = Ext.String.trim((cmp.cls || '') + ' lk-control-header-focusable');
		});
		me.on('afterrender', me.bindHeaderComboKeys, me, {
			single : true
		});
		me.on('afterrender', me.bindHeaderTabSequence, me, {
			single : true
		});
		this.callParent(arguments);
	},

	bindHeaderTabSequence : function () {
		if (!this.el || this.leankorHeaderTabSequenceBound) {
			return;
		}

		this.leankorHeaderTabSequenceBound = true;
		this.el.on("keydown", this.onHeaderControlKeyDown, this);
		this.el.on("keyup", this.onHeaderControlKeyUp, this);
		Ext.getDoc().on("keydown", this.onHeaderDocumentKeyDown, this);
		Ext.getDoc().on("mousedown", this.onHeaderPointerDown, this);
		Ext.getDoc().on("touchstart", this.onHeaderPointerDown, this);
	},

	onHeaderPointerDown : function (e, target) {
		if (!this.el || !target || !this.el.contains(target)) {
			return;
		}

		if (Ext.getBody()) {
			Ext.getBody().removeCls("lk-keyboard-focus-mode");
		}
	},
	onHeaderControlKeyUp : function (e, target) {
		if (
			this.isHeaderActivationKey(e) &&
			this.isTargetInsideHeaderFocusable(target)
		) {
			this.keepHeaderKeyboardFocusMode(target, true);
		}
	},
	isTargetInsideHeaderFocusable : function (target) {
		var targetEl = target && Ext.fly(target),
			focusable =
				targetEl &&
				(targetEl.is(".lk-control-header-focusable") ||
					targetEl.up(".lk-control-header-focusable", this.el, true));

		return !!focusable;
	},
	keepHeaderKeyboardFocusMode : function (target, restoreButtonFocus) {
		var cmp = target && Ext.Component.fromElement(target, this.el);

		Ext.defer(
			function () {
				if (Ext.getBody()) {
					Ext.getBody().addCls("lk-keyboard-focus-mode");
				}

				if (
					restoreButtonFocus &&
					cmp &&
					cmp.isXType &&
					cmp.isXType("button") &&
					!(cmp.isDisabled && cmp.isDisabled()) &&
					!(cmp.isHidden && cmp.isHidden())
				) {
					if (cmp.focus) {
						cmp.focus();
					} else if (cmp.el && cmp.el.dom) {
						cmp.el.dom.focus();
					}
				}
			},
			restoreButtonFocus ? 25 : 1
		);
	},

	onHeaderDocumentKeyDown : function (e, target) {
		if (!this.el || !target || !this.el.contains(target)) {
			return;
		}

		if (this.isKeyboardFocusKey(e) && Ext.getBody()) {
			Ext.getBody().addCls("lk-keyboard-focus-mode");
		}

		this.onHeaderControlKeyDown(e, target);
	},

	isKeyboardFocusKey : function (e) {
		var key = e.getKey && e.getKey(),
			modifierKeys = [
				Ext.EventObject.SHIFT || 16,
				Ext.EventObject.CTRL || 17,
				Ext.EventObject.ALT || 18,
				Ext.EventObject.CAPS_LOCK || 20,
				Ext.EventObject.META || 91
			];

		return !!(key && !Ext.Array.contains(modifierKeys, key));
	},
	isHeaderActivationKey : function (e) {
		var key = e.getKey && e.getKey(),
			spaceKey = Ext.EventObject.SPACE || 32;

		return key === e.ENTER || key === spaceKey;
	},

	onHeaderControlKeyDown : function (e, target) {
		var tabKey = Ext.EventObject.TAB || 9,
			lastControl;

		if (e.getKey() !== tabKey || e.shiftKey) {
			return;
		}

		if (this.isExpandedComboTarget(target)) {
			return;
		}

		lastControl = this.getLastFocusableHeaderControl();
		if (!lastControl || !this.isTargetInsideControl(target, lastControl)) {
			return;
		}

		if (this.focusHeaderAddButton()) {
			e.stopEvent();
		}
	},

	getLastFocusableHeaderControl : function () {
		var controls = [],
			lastControl;

		Ext.Array.forEach(this.query("[reference]"), function (cmp) {
			if (
				!cmp.hidden &&
				!(cmp.isHidden && cmp.isHidden()) &&
				(!cmp.isVisible || cmp.isVisible(true)) &&
				!(cmp.isDisabled && cmp.isDisabled()) &&
				cmp.el &&
				cmp.el.dom
			) {
				controls.push(cmp);
			}
		});

		lastControl = controls.length && controls[controls.length - 1];
		return lastControl || null;
	},

	isTargetInsideControl : function (target, cmp) {
		return !!(
			target &&
			cmp &&
			cmp.el &&
			(target === cmp.el.dom || cmp.el.contains(target))
		);
	},

	isExpandedComboTarget : function (target) {
		var combo = target && Ext.Component.fromElement(target, this.el, "combo");

		return !!(combo && combo.isExpanded);
	},

	focusHeaderAddButton : function () {
		var addButton = this.getHeaderAddButton();

		if (!addButton || !addButton.dom) {
			return false;
		}

		addButton.dom.setAttribute("tabindex", "0");
		addButton.dom.setAttribute("role", "button");
		Ext.defer(function () {
			if (Ext.getBody()) {
				Ext.getBody().addCls("lk-keyboard-focus-mode");
			}
			addButton.dom.focus();
		}, 1);
		return true;
	},

	getHeaderAddButton : function () {
		var ownerPanel =
				this.ownerCt ||
				this.up("resourceschedule") ||
				this.up("assignmentgridpanel"),
			addButton,
			panels;

		addButton = ownerPanel && ownerPanel.el && ownerPanel.el.down(".addBtnTop");
		if (addButton && addButton.dom) {
			return addButton;
		}

		panels = Ext.ComponentQuery.query("resourceschedule").concat(
			Ext.ComponentQuery.query("assignmentgridpanel")
		);
		Ext.Array.each(panels, function (panel) {
			if (
				panel &&
				panel.el &&
				!panel.hidden &&
				!(panel.isVisible && !panel.isVisible(true))
			) {
				addButton = panel.el.down(".addBtnTop");
				return !(addButton && addButton.dom);
			}
			return true;
		});

		return addButton || null;
	},

	bindHeaderComboKeys : function () {
		this.syncHeaderControlAriaLabels();

		Ext.Array.forEach(
			this.query("combo"),
			function (combo) {
				if (combo.leankorHeaderComboKeysBound) {
					return;
				}

				combo.leankorHeaderComboKeysBound = true;
				LeankorApp.util.AccessibilityUtil.wireComboAria(combo);
				combo.on("specialkey", this.onHeaderComboSpecialKey, this);
				combo.on("collapse", this.onHeaderComboCollapse, this);

				if (combo.el) {
					combo.el.on(
						"keydown",
						function (e) {
							this.onHeaderComboSpecialKey(combo, e);
						},
						this
					);
				}
			},
			this
		);
	},
	onHeaderComboCollapse : function (combo) {
		this.restoreHeaderControlFocus(combo);
	},
	restoreHeaderControlFocus : function (cmp) {
		if (!cmp || cmp.destroyed || (cmp.isDisabled && cmp.isDisabled())) {
			return;
		}

		Ext.defer(function () {
			if (cmp.destroyed || (cmp.isDisabled && cmp.isDisabled())) {
				return;
			}

			if (cmp.focus) {
				cmp.focus();
			} else if (cmp.el && cmp.el.dom) {
				cmp.el.dom.focus();
			}
		}, 25);
	},

	onHeaderComboSpecialKey : function (combo, e, eOpts) {
		var tabKey = Ext.EventObject.TAB || 9,
			key = e.getKey && e.getKey();

		if (eOpts && eOpts.fromBoundList) {
			return;
		}

		if (key === tabKey && combo.isExpanded) {
			combo.collapse();
		} else if (key === e.ESC && combo.isExpanded) {
			e.stopEvent();
			combo.collapse();
		} else if (key === e.ENTER && combo.reference === "projectFilter") {
			e.stopEvent();
			combo.fireEvent("expand", combo);
		} else if (key === e.ENTER && !combo.isExpanded) {
			e.stopEvent();
			combo.expand();
		}
	},

	syncHeaderControlAriaLabels : function () {
		Ext.Array.forEach(
			this.query("[reference]"),
			function (cmp) {
				var label = cmp.ariaLabel || this.getHeaderControlLabel(cmp);

				if (!label) {
					return;
				}

				if (cmp.ariaEl && cmp.ariaEl.dom) {
					cmp.ariaEl.dom.setAttribute("aria-label", label);
				}

				if (cmp.inputEl && cmp.inputEl.dom) {
					cmp.inputEl.dom.setAttribute("aria-label", label);
				}

				if (cmp.el && cmp.el.dom) {
					cmp.el.dom.setAttribute("aria-label", label);
				}
			},
			this
		);
	},

	getHeaderControlLabel : function (cmp) {
		var label = cmp.tooltip || cmp.emptyText || cmp.text || cmp.reference || "",
			localeName = typeof Locale !== "undefined" && Locale.LocaleName;

		if (cmp.reference === "popOut") {
			label = (localeName && localeName.ZoomToFit) || label || "Zoom to fit";
		} else if (cmp.reference === "help") {
			label = (localeName && localeName.Help) || label || "Help";
		}

		return Ext.String.trim(
			Ext.String.htmlDecode(String(label).replace(/<[^>]*>/g, ""))
		);
	}
});
