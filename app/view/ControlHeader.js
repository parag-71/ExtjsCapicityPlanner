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

		Ext.getStore('monthStore').setData([{
					"name": Locale.LocaleName.Weeks,
					"value": "weekAndMonth"
				}, {
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
		Ext.getStore('settingsStore').loadData([{
					"name": Locale.LocaleName.ZoomToFit,
					"value": "Zoom to Fit",
					id: 1
				}, {
					"name": Locale.LocaleName.Today,
					"value": "Today",
					id: 6
				}, {
					"name": Locale.LocaleName.Print,
					"value": "Print",
					id: 2
				}
			]);
		Ext.getStore('departmentOption').loadData([{
			"name": Ext.htmlEncode(Locale.LocaleName.ByResourceTypes),
			"value": Ext.htmlEncode(Locale.LocaleName.ByResourceTypes),
			id: 1
		}          
		]);
		this.tools = [{
				xtype: 'combo',
				store: 'departmentOption',
				queryMode: 'local',
				valueField: 'value',
				cls: 'combo-custom-cls-period',
				forceSelection: false,
				editable: false,
				listConfig: {
					width: 190,
					minWidth: 190,
					cls: 'lk-view-combo-list'
				},
				emptyText: Locale.LocaleName.View,
				reference: 'departmentFilter',
				tpl: Ext.create('Ext.XTemplate',
					'<ul class="x-list-plain"><tpl for=".">',
					'<li role="option" class="x-boundlist-item">{name}</li>',
					'</tpl></ul>')

			}, {
				xtype : 'combo',
				store : 'folderProjectTree',
				valueField : 'value',
				selectOnTab : false,
				editable : false,
				cls : 'combo-custom-cls-period',
				emptyText : Ext.htmlEncode(Locale.LocaleName.Projects),
				ariaLabel : Locale.LocaleName.Projects,
				reference : 'projectFilter'
			}, {
				xtype : 'button',
				tooltip: Ext.htmlEncode(Locale.LocaleName.PreviousTimespan),
				reference: 'shiftPrevious',
				iconCls: 'icon-previous',
				cls: 'toolbar-custom-btn',
				text: Ext.htmlEncode(Locale.LocaleName.PreviousTimespan)
			}, {
				xtype: 'button',
				tooltip: Ext.htmlEncode(Locale.LocaleName.NextTimespan),
				reference: 'shiftNext',
				iconCls: 'icon-next',
				cls: 'toolbar-custom-btn',
				text: Ext.htmlEncode(Locale.LocaleName.NextTimespan)
			}, {
				xtype: 'combo',
				store: 'viewStore',
				queryMode: 'local',
				valueField: 'value',
				cls: 'combo-custom-cls-period',
				forceSelection: false,
				editable: false,
				listConfig: {
					width: 190,
					minWidth: 190,
					cls: 'lk-view-combo-list'
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
				autoSelect: false,
				reference: 'settingCheck',
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
				tpl: Ext.create('Ext.XTemplate',
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
				tooltip : Ext.htmlEncode(Locale.LocaleName.ZoomToFit),
				ariaLabel : Ext.htmlEncode(Locale.LocaleName.ZoomToFit),
				cls : 'toolbar-custom-btn toolbar-popout-btn'
			}, {
				xtype : 'button',
				reference : 'help',
				iconCls : 'icon-help',
				tooltip : Ext.htmlEncode((Locale.LocaleName && Locale.LocaleName.Help) || 'Help'),
				ariaLabel : Ext.htmlEncode((Locale.LocaleName && Locale.LocaleName.Help) || 'Help'),
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
			single: true
		});
		me.on('afterrender', me.bindInitialHeaderFocus, me, {
			single: true
		});
		this.callParent(arguments);
	},

	bindInitialHeaderFocus: function () {
		if (this.leankorInitialHeaderFocusBound || !Ext.getDoc()) {
			return;
		}

		this.leankorInitialHeaderFocusBound = true;
		Ext.getDoc().on("keydown", this.onInitialHeaderDocumentKeyDown, this);
		this.on("destroy", function () {
			if (Ext.getDoc()) {
				Ext.getDoc().un("keydown", this.onInitialHeaderDocumentKeyDown, this);
			}
		}, this, { single: true });
	},

	focusInitialHeaderControlIfNeeded: function () {
		var active = document.activeElement,
			firstControl;

		if (
			this.leankorInitialHeaderFocusDone ||
			!this.el ||
			!this.el.dom ||
			(active &&
				active !== document.body &&
				active !== document.documentElement &&
				active !== document &&
				active !== window)) {
			return;
		}

		firstControl = this.getFirstFocusableHeaderControl();
		if (!firstControl) {
			return;
		}

		this.leankorInitialHeaderFocusDone = true;
		if (Ext.getBody()) {
			Ext.getBody().addCls("lk-keyboard-focus-mode");
		}
		this.focusHeaderControl(firstControl);
	},

	onInitialHeaderDocumentKeyDown: function (e, target) {
		var tabKey = Ext.EventObject.TAB || 9,
			active = document.activeElement,
			firstControl;

		if (
			e.getKey() !== tabKey ||
			e.shiftKey ||
			this.leankorInitialHeaderFocusDone ||
			!this.el ||
			!this.el.dom) {
			return;
		}

		if (
			active &&
			active !== document.body &&
			active !== document.documentElement &&
			active !== document &&
			active !== window) {
			return;
		}

		firstControl = this.getFirstFocusableHeaderControl();
		if (!firstControl) {
			return;
		}

		this.leankorInitialHeaderFocusDone = true;
		if (Ext.getBody()) {
			Ext.getBody().addCls("lk-keyboard-focus-mode");
		}
		e.stopEvent();
		this.focusHeaderControl(firstControl);
	},

	getFirstFocusableHeaderControl: function () {
		var firstControl = null;

		Ext.Array.forEach(this.query("[reference]"), function (cmp) {
			if (
				!firstControl &&
				!cmp.hidden &&
				!(cmp.isHidden && cmp.isHidden()) &&
				(!cmp.isVisible || cmp.isVisible(true)) &&
				!(cmp.isDisabled && cmp.isDisabled()) &&
				cmp.el &&
				cmp.el.dom) {
				firstControl = cmp;
			}
		});

		return firstControl;
	},

	focusHeaderControl: function (cmp) {
		Ext.defer(function () {
			if (!cmp || cmp.destroyed) {
				return;
			}
			if (cmp.focus) {
				cmp.focus();
			} else if (cmp.el && cmp.el.dom) {
				cmp.el.dom.focus();
			}
		}, 1);
	},

	bindHeaderTabSequence: function () {
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
			this.isTargetInsideHeaderFocusable(target)) {
			this.keepHeaderKeyboardFocusMode(target, true);
		}
	},
	isTargetInsideHeaderFocusable: function (target) {
		var targetEl = target && Ext.fly(target),
			focusable =
				targetEl &&
				(targetEl.is(".lk-control-header-focusable") ||
					targetEl.up(".lk-control-header-focusable", this.el, true));

		return !!focusable;
	},
	keepHeaderKeyboardFocusMode: function (target, restoreButtonFocus) {
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
				!(cmp.isHidden && cmp.isHidden())) {
				if (cmp.focus) {
					cmp.focus();
				} else if (cmp.el && cmp.el.dom) {
					cmp.el.dom.focus();
				}
			}
		},
			restoreButtonFocus ? 25 : 1);
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
				cmp.el.dom) {
				controls.push(cmp);
			}
		});

		lastControl = controls.length && controls[controls.length - 1];
		return lastControl || null;
	},

	isTargetInsideControl: function (target, cmp) {
		return !!(
			target &&
			cmp &&
			cmp.el &&
			(target === cmp.el.dom || cmp.el.contains(target)));
	},

	isExpandedComboTarget: function (target) {
		var combo = target && Ext.Component.fromElement(target, this.el, "combo");

		return !!(combo && combo.isExpanded);
	},

	focusHeaderAddButton: function () {
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

	getHeaderAddButton: function () {
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
				Ext.ComponentQuery.query("assignmentgridpanel"));
		Ext.Array.each(panels, function (panel) {
			if (
				panel &&
				panel.el &&
				!panel.hidden &&
				!(panel.isVisible && !panel.isVisible(true))) {
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
			if (combo.reference === "departmentFilter") {
				combo.on("expand", this.onHeaderViewComboExpand, this);
			}

			if (combo.el) {
				combo.el.on(
					"keydown",
					function (e) {
					this.onHeaderComboSpecialKey(combo, e);
				},
					this);
			}
		},
			this);
	},
	onHeaderComboCollapse: function (combo) {
		if (combo.leankorSkipRestoreFocus) {
			combo.leankorSkipRestoreFocus = false;
			return;
		}

		this.restoreHeaderControlFocus(combo);
	},
	onHeaderViewComboExpand: function (combo) {
		var me = this;

		Ext.defer(function () {
			me.focusHeaderViewComboList(combo);
		}, 1);
	},
	syncHeaderViewComboList: function (combo) {
		var picker = combo && combo.getPicker && combo.getPicker(),
		listEl = picker && picker.el,
		label = this.getHeaderControlLabel(combo);

		if (!listEl || !listEl.dom) {
			return;
		}

		listEl.dom.setAttribute("role", "listbox");
		listEl.dom.setAttribute("aria-label", label);
		listEl.select(".x-boundlist-item").each(function (itemEl) {
			var text = Ext.String.trim(itemEl.dom.textContent || itemEl.dom.innerText || ""),
			record = picker.getRecord && picker.getRecord(itemEl.dom),
			value =
				record &&
				record.get &&
				record.get(combo.valueField || "value");

			itemEl.dom.setAttribute("tabindex", "0");
			itemEl.dom.setAttribute("role", "option");
			itemEl.dom.setAttribute(
				"aria-selected",
				String(value === combo.getValue()));
			if (
				combo.reference === "settingCheck" &&
				value === combo.getValue() &&
				document.activeElement !== itemEl.dom) {
				itemEl.removeCls("x-boundlist-item-focused");
				itemEl.removeCls("x-boundlist-item-over");
			}
			if (text) {
				itemEl.dom.setAttribute("aria-label", text);
			}
		});

		if (!picker.leankorHeaderViewListFocusBound) {
			picker.leankorHeaderViewListFocusBound = true;
			listEl.on(
				"focusin",
				function (e, target) {
					Ext.fly(target).addCls("x-boundlist-item-focused");
				},
				this,
				{
					delegate: ".x-boundlist-item"
				});
			listEl.on(
				"focusout",
				function (e, target) {
					Ext.fly(target).removeCls("x-boundlist-item-focused");
				},
				this,
				{
					delegate: ".x-boundlist-item"
				});
		}

		if (!picker.leankorHeaderViewListKeysBound) {
			picker.leankorHeaderViewListKeysBound = true;
			listEl.on(
				"keydown",
				function (e, target) {
				me.onHeaderViewComboListKeyDown(combo, picker, e, target);
			},
				me, {
				delegate: ".x-boundlist-item"
			});
		}
	},
	onHeaderViewComboListKeyDown: function (combo, picker, e, target) {
		var key = e.getKey && e.getKey(),
		tabKey = Ext.EventObject.TAB || 9,
		enterKey = Ext.EventObject.ENTER || 13,
		spaceKey = Ext.EventObject.SPACE || 32,
		items = picker && picker.el && picker.el.select(".x-boundlist-item").elements,
		index = Ext.Array.indexOf(items || [], target),
		record,
		controller;

		if (key === enterKey || key === spaceKey) {
			e.stopEvent();
			record = picker.getRecord && picker.getRecord(target);
			if (record) {
				combo.setValue(record.get(combo.valueField || "value"));
				if (combo.reference === "departmentFilter") {
					combo.leankorSkipRestoreFocus = true;
					controller =
						(combo.lookupController && combo.lookupController()) ||
						(this.up &&
							this.up("mainviewport") &&
							this.up("mainviewport").getController &&
							this.up("mainviewport").getController()) ||
						(Ext.ComponentQuery.query("mainviewport")[0] &&
							Ext.ComponentQuery.query("mainviewport")[0].getController &&
							Ext.ComponentQuery.query("mainviewport")[0].getController());
					if (
						controller &&
						controller.onDepartmentFilter) {
						controller.onDepartmentFilter(combo, [record]);
					} else {
						combo.fireEvent("select", combo, [record]);
					}
				} else {
					combo.fireEvent("select", combo, [record]);
				}
			}
			combo.collapse();
			return;
		}

		if (key !== tabKey) {
			return;
		}

		if (e.shiftKey && index <= 0) {
			e.stopEvent();
			combo.leankorSkipRestoreFocus = true;
			combo.collapse();
			this.restoreHeaderControlFocus(combo);
		} else if (!e.shiftKey && index === (items || []).length - 1) {
			e.stopEvent();
			combo.leankorSkipRestoreFocus = true;
			combo.collapse();
			this.focusNextHeaderControl(combo);
		}
	},
	focusHeaderViewComboList: function (combo) {
		var me = this;

		Ext.defer(function () {
			var picker = combo && combo.getPicker && combo.getPicker(),
			firstItem;

			me.syncHeaderViewComboList(combo);
			firstItem = picker && picker.el && picker.el.down(".x-boundlist-item");
			if (firstItem && firstItem.dom) {
				picker.el.select(".x-boundlist-item-focused").removeCls("x-boundlist-item-focused");
				firstItem.addCls("x-boundlist-item-focused");
				firstItem.dom.setAttribute("tabindex", "0");
				firstItem.dom.focus();
			}
		}, 25);
	},
	focusNextHeaderControl: function (cmp) {
		var controls = this.getFocusableHeaderControls(),
		index = Ext.Array.indexOf(controls, cmp),
		next = controls[index + 1];

		if (!next) {
			return false;
		}

		Ext.defer(function () {
			if (next.focus) {
				next.focus();
			} else if (next.el && next.el.dom) {
				next.el.dom.focus();
			}
		}, 1);
		return true;
	},
	restoreHeaderControlFocus: function (cmp) {
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

	onHeaderComboSpecialKey: function (combo, e, eOpts) {
		var tabKey = Ext.EventObject.TAB || 9,
		enterKey = Ext.EventObject.ENTER || 13,
		escKey = Ext.EventObject.ESC || 27,
		downKey = Ext.EventObject.DOWN || 40,
		key = e.getKey && e.getKey();

		if (eOpts && eOpts.fromBoundList) {
			return;
		}

		if (
			key === downKey &&
			!combo.isExpanded &&
			combo.reference === "departmentFilter") {
			e.stopEvent();
			combo.expand();
			this.focusHeaderViewComboList(combo);
		} else if (
			key === tabKey &&
			combo.isExpanded &&
			combo.reference === "departmentFilter") {
			e.stopEvent();
			this.focusHeaderViewComboList(combo);
		} else if (key === tabKey && combo.isExpanded) {
			combo.collapse();
		} else if (key === escKey && combo.isExpanded) {
			e.stopEvent();
			combo.collapse();
		} else if (key === enterKey && combo.reference === "projectFilter") {
			e.stopEvent();
			combo.isExpanded = false;
			combo.fireEvent("expand", combo);
		} else if (key === enterKey && !combo.isExpanded) {
			e.stopEvent();
			combo.expand();
		}
	},

	syncHeaderControlAriaLabels: function () {
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
			this);
	},
	getFocusableHeaderControls: function () {
		var controls = [];

		Ext.Array.forEach(this.query("[reference]"), function (cmp) {
			if (
				!cmp.hidden &&
				!(cmp.isHidden && cmp.isHidden()) &&
				(!cmp.isVisible || cmp.isVisible(true)) &&
				!(cmp.isDisabled && cmp.isDisabled()) &&
				cmp.el &&
				cmp.el.dom) {
				controls.push(cmp);
			}
		});

		return controls;
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
			Ext.String.htmlDecode(String(label).replace(/<[^>]*>/g, "")));
	}
});
