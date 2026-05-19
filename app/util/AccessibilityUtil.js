/*
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: AccessibilityUtil.js
 */
Ext.define("LeankorApp.util.AccessibilityUtil", {
	singleton : true,

	init : function () {
		if (this.leankorAccessibilityUtilInitialized) {
			return;
		}

		this.leankorAccessibilityUtilInitialized = true;
		this.installGlobalEscapeHandler();
	},

	installGlobalEscapeHandler : function () {
		document.addEventListener(
			"keydown",
			function (e) {
				var key = e.keyCode || e.which;

				if (key !== 27 && e.key !== "Escape") {
					return;
				}

				var floaters = Ext.ComponentQuery.query("component");

				floaters = Ext.Array.filter(floaters, function (floater) {
					return (
						Ext.isFunction(floater.isFloating) &&
						floater.isFloating() &&
						Ext.isFunction(floater.isVisible) &&
						floater.isVisible(true) &&
						!(
							floater.isBoundList ||
							floater.xtype === "boundlist" ||
							floater.pickerField
						)
					);
				});

				if (floaters.length) {
					floaters.sort(function (a, b) {
						var za =
								(a.el &&
									a.el.dom &&
									parseInt(a.el.dom.style.zIndex, 10)) ||
								0,
							zb =
								(b.el &&
									b.el.dom &&
									parseInt(b.el.dom.style.zIndex, 10)) ||
								0;

						return zb - za;
					});

					var top = floaters[0];
					if (top.closable !== false && Ext.isFunction(top.close)) {
						top.close();
					} else if (Ext.isFunction(top.hide)) {
						top.hide();
					} else {
						return;
					}

					e.stopPropagation();
					return;
				}

				var expandedCombo = Ext.Array.findBy(
					Ext.ComponentQuery.query("combobox"),
					function (combo) {
						return Ext.isFunction(combo.isExpanded) && combo.isExpanded();
					}
				);
				if (expandedCombo) {
					expandedCombo.collapse();
					e.stopPropagation();
					return;
				}

				var tips = Ext.Array.filter(
					Ext.ComponentQuery.query("tooltip, tip"),
					function (tip) {
						return Ext.isFunction(tip.isVisible) && tip.isVisible(true);
					}
				);
				if (tips && tips.length) {
					tips[tips.length - 1].hide();
					e.stopPropagation();
				}
			},
			true
		);
	},

	wireComboAria : function (combo) {
		if (!combo || combo.leankorComboAriaWired) {
			return;
		}

		combo.leankorComboAriaWired = true;

		var apply = function () {
			var dom =
				(combo.inputEl && combo.inputEl.dom) ||
				(combo.ariaEl && combo.ariaEl.dom) ||
				(combo.el && combo.el.dom);

			if (!dom) {
				return;
			}

			dom.setAttribute("aria-haspopup", "listbox");
			dom.setAttribute("aria-expanded", "false");
			dom.setAttribute("aria-autocomplete", "none");

			combo.on("expand", function () {
				dom.setAttribute("aria-expanded", "true");
				if (combo.el && combo.el.dom) {
					combo.el.dom.classList.add("combo-expanded");
				}
			});

			combo.on("collapse", function () {
				dom.setAttribute("aria-expanded", "false");
				if (combo.el && combo.el.dom) {
					combo.el.dom.classList.remove("combo-expanded");
				}
			});

			var onEnterExpand = function (e) {
				if (!e || e.getKey() !== e.ENTER) {
					return;
				}

				var pickerVisible =
					combo.picker &&
					Ext.isFunction(combo.picker.isVisible) &&
					combo.picker.isVisible();

				if (pickerVisible) {
					return;
				}

				e.stopEvent();

				var trigger = Ext.isFunction(combo.getPickerTrigger)
					? combo.getPickerTrigger()
					: null;

				if (trigger && trigger.el && trigger.el.dom) {
					trigger.el.dom.click();
					return;
				}

				combo.isExpanded = false;
				if (Ext.isFunction(combo.onTriggerClick)) {
					combo.onTriggerClick(combo, null, e);
				} else if (Ext.isFunction(combo.expand)) {
					combo.expand();
				}
			};

			combo.on("keydown", onEnterExpand);
			if (combo.inputEl) {
				combo.inputEl.on("keydown", onEnterExpand);
			}
			if (combo.el) {
				combo.el.on("keydown", onEnterExpand);
			}
		};

		if (combo.rendered) {
			apply();
		} else {
			combo.on("afterrender", apply, null, { single: true });
		}
	},

	initCloseToolAccessibility : function (cmp, useKeyboardMode) {
		var localeName = typeof Locale !== "undefined" && Locale.LocaleName,
			label = (localeName && localeName.CloseDialog) || "Close",
			tools = cmp && cmp.query ? cmp.query("tool") : [],
			me = this;

		label = me.cleanAriaText(label);

		Ext.Array.forEach(tools, function (tool) {
			var focusEl;

			if (tool.type && tool.type !== "close") {
				return;
			}

			tool.focusable = true;
			tool.tabIndex = 0;
			focusEl =
				(tool.el &&
					tool.el.dom &&
					tool.el) ||
				(tool.el && tool.el.down && tool.el.down(".x-tool-close")) ||
				(tool.toolEl &&
					tool.toolEl.hasCls &&
					tool.toolEl.hasCls("x-tool-close") &&
					tool.toolEl) ||
				(tool.el && tool.el.dom && tool.el) ||
				tool.focusEl ||
				tool.ariaEl ||
				(tool.toolEl && tool.toolEl.dom && tool.toolEl);

			if (focusEl && focusEl.dom) {
				focusEl.dom.setAttribute("tabindex", "0");
				focusEl.dom.setAttribute("role", "button");
				focusEl.dom.setAttribute("aria-label", label);
				focusEl.dom.setAttribute("title", label);
				me.bindCloseToolEnterToClose(cmp, tool, focusEl);
			}

			if (tool.el && tool.el.dom && focusEl && tool.el.dom !== focusEl.dom) {
				tool.el.dom.setAttribute("tabindex", "-1");
				tool.el.dom.setAttribute("role", "presentation");
			}

			if (tool.el && tool.el.dom && focusEl && tool.el.dom === focusEl.dom) {
				tool.el
					.select(".x-tool-close, .x-tool-tool-el, .x-tool-img")
					.each(function (childEl) {
						if (childEl && childEl.dom && childEl.dom !== focusEl.dom) {
							childEl.dom.setAttribute("tabindex", "-1");
							childEl.dom.setAttribute("role", "presentation");
						}
					});
			}

			if (
				tool.toolEl &&
				tool.toolEl.dom &&
				focusEl &&
				focusEl.dom !== tool.toolEl.dom
			) {
				tool.toolEl.dom.setAttribute("tabindex", "-1");
				tool.toolEl.dom.setAttribute("role", "presentation");
			}
		});
	},

	bindCloseToolEnterToClose : function (cmp, tool, focusEl) {
		var me = this;

		if (!cmp || !tool || !focusEl || !focusEl.dom || tool.leankorCloseKeysBound) {
			return;
		}

		tool.leankorCloseKeysBound = true;
		focusEl.on("keydown", function (e, target) {
			var key = e.getKey && e.getKey(),
				enterKey = Ext.EventObject.ENTER || 13,
				spaceKey = Ext.EventObject.SPACE || 32;

			if (key !== enterKey && key !== spaceKey) {
				return true;
			}

			e.stopEvent();
			me.closeComponent(cmp, e, target);
			return false;
		});
	},

	closeComponent : function (cmp, e, target) {
		if (Ext.isFunction(cmp.leankorEscapeHandler)) {
			cmp.leankorEscapeHandler(e, target);
		} else if (cmp.close) {
			cmp.close();
		} else if (cmp.hide) {
			cmp.hide();
		}
	},

	cleanAriaText : function (value) {
		return Ext.String.trim(
			Ext.String.htmlDecode(String(value || "").replace(/<[^>]*>/g, ""))
		);
	},

	bindEscapeToClose : function (cmp) {
		var me = this;

		if (!cmp || cmp.leankorEscapeToCloseBound) {
			return cmp;
		}

		cmp.leankorEscapeToCloseBound = true;
		cmp.on({
			afterrender : function () {
				me.attachEscapeToClose(cmp);
			},
			scope : me
		});

		if (cmp.rendered) {
			me.attachEscapeToClose(cmp);
		}

		return cmp;
	},

	attachEscapeToClose : function (cmp) {
		var me = this;

		if (!cmp || !cmp.el || cmp.leankorEscapeToCloseElBound) {
			return;
		}

		cmp.leankorEscapeToCloseElBound = true;
		cmp.el.on("keydown", function (e, target) {
			var escKey = Ext.EventObject.ESC || 27,
				key = e.getKey && e.getKey();

			if (key !== escKey) {
				return true;
			}

			e.stopEvent();
			me.closeComponent(cmp, e, target);
			return false;
		});
	},

	applyHeaderPopupMethods : function (controller) {
		var me = this;

		if (!controller || controller.leankorHeaderPopupMethodsApplied) {
			return;
		}

		controller.leankorHeaderPopupMethodsApplied = true;
		Ext.Array.forEach(this.headerPopupMethodNames, function (methodName) {
			if (!controller[methodName]) {
				controller[methodName] = me.headerPopupMethods[methodName];
			}
		});
		controller.cleanAriaText = controller.cleanAriaText || Ext.Function.bind(this.cleanAriaText, this);
		controller.getElementText = controller.getElementText || Ext.Function.bind(this.getElementText, this);
	},

	headerPopupMethodNames : [
		'bindHeaderPopupKeys',
		'bindHeaderPopupDocumentTrap',
		'registerHeaderPopupTrap',
		'unregisterHeaderPopupTrap',
		'getActiveHeaderPopupTrap',
		'onHeaderPopupDocumentKeyDown',
		'onHeaderPopupDocumentFocusIn',
		'onHeaderPopupDocumentPointerDown',
		'enforceHeaderPopupTrap',
		'ensureHeaderPopupFocusGuards',
		'focusHeaderPopupEdge',
		'isHeaderPopupOwnedFloatingTarget',
		'syncHeaderPopupDialogAccessibility',
		'getHeaderPopupDialogLabel',
		'syncHeaderPopupTools',
		'syncHeaderPopupCloseToolDom',
		'bindHeaderPopupCloseToolElementKeys',
		'bindHeaderPopupCloseToolDomKeys',
		'bindPrintPopupAccessibility',
		'syncPrintPopupAccessibility',
		'onHeaderPopupKeyDown',
		'getHeaderPopupButtonFromTarget',
		'isHeaderPopupRowTarget',
		'handleHeaderPopupArrowNavigation',
		'getHeaderPopupRowElements',
		'getHeaderPopupRowFocusElement',
		'setHeaderPopupActiveRowTabIndex',
		'getHeaderPopupRowElementFromTarget',
		'focusHeaderPopupSiblingRow',
		'focusHeaderPopupParentRow',
		'trapHeaderPopupFocus',
		'focusHeaderPopupAdjacentElement',
		'isSameHeaderPopupFocusGroup',
		'getHeaderPopupFocusableElements',
		'isTargetInsideElement',
		'focusHeaderPopupElement',
		'getHeaderPopupPrimaryButton',
		'hasHeaderPopupRows',
		'isHeaderPopupPrimaryButtonTarget',
		'closeHeaderPopupOnEscape',
		'closeHeaderPopup',
		'restoreHeaderPopupFocus',
		'fireHeaderPopupButton',
		'focusHeaderPopup',
		'isHeaderPopupTextInput',
		'isHeaderPopupTool',
		'getHeaderPopupCloseToolElement',
		'focusHeaderPopupCloseTool',
		'isHeaderPopupCloseTool',
		'getHeaderPopupRecord',
		'getHeaderPopupRecordFromTarget',
		'toggleHeaderPopupRecord',
		'toggleHeaderPopupTreeRecord',
		'bindResourceTypePopupAccessibility',
		'bindResourceTypePopupViewAccessibility',
		'setResourceTypePopupRowFocus',
		'syncResourceTypePopupAccessibility',
		'syncResourceTypePopupRows',
		'prepareResourceTypePopupRow',
		'syncPopupButtonAccessibility',
		'bindPopupButtonKeyboardHandler',
		'syncPopupFieldAccessibility',
		'syncPopupToolAccessibility',
		'bindPopupToolKeyboardHandler',
		'getPopupButtonLabel',
		'getPopupFieldLabel',
		'getResourceTypeRecordLabel',
		'getResourceTypePopupLabel',
		'getResourceTypeSearchLabel'
	],

	headerPopupMethods : {
    bindHeaderPopupKeys: function (popup, config) {
        var me = this,
        attachKeys;

        if (!popup || popup.leankorHeaderPopupKeysBound) {
            return popup;
        }

        config = config || {};
        popup.leankorHeaderPopupKeysBound = true;
        popup.leankorHeaderPopupConfig = config;
        me.bindHeaderPopupDocumentTrap();
        attachKeys = function (cmp) {
            if (!cmp.el || cmp.leankorHeaderPopupElKeysBound) {
                return;
            }

            cmp.leankorHeaderPopupElKeysBound = true;
            me.ensureHeaderPopupFocusGuards(cmp);
            me.syncHeaderPopupDialogAccessibility(cmp, config);
            me.syncHeaderPopupTools(cmp);
            cmp.leankorEscapeHandler = function (e, target) {
                me.closeHeaderPopupOnEscape(cmp, config, e, target);
            };
            LeankorApp.util.AccessibilityUtil.initCloseToolAccessibility(cmp, false);
            me.syncHeaderPopupCloseToolDom(cmp, config);
            LeankorApp.util.AccessibilityUtil.bindEscapeToClose(cmp);
            me.bindHeaderPopupCloseToolDomKeys(cmp, config);
            cmp.el.on('keydown', function (e, target) {
                me.onHeaderPopupKeyDown(cmp, config, e, target);
            });
        };

        popup.on({
            afterrender: attachKeys,
            show: function (cmp) {
                me.registerHeaderPopupTrap(cmp);
                me.syncHeaderPopupDialogAccessibility(cmp, config);
                me.syncHeaderPopupTools(cmp);
                me.syncHeaderPopupCloseToolDom(cmp, config);
                me.focusHeaderPopup(cmp, config);
                Ext.defer(function () {
                    me.syncHeaderPopupCloseToolDom(cmp, config);
                    me.enforceHeaderPopupTrap(cmp);
                }, 75);
            },
            close: function () {
                me.unregisterHeaderPopupTrap(popup);
                me.restoreHeaderPopupFocus(config, popup);
            },
            hide: function () {
                me.unregisterHeaderPopupTrap(popup);
                me.restoreHeaderPopupFocus(config, popup);
            },
            destroy: function () {
                me.unregisterHeaderPopupTrap(popup);
            },
            scope: me
        });

        if (popup.rendered) {
            attachKeys(popup);
            if (!popup.isVisible || popup.isVisible()) {
                me.registerHeaderPopupTrap(popup);
                Ext.defer(function () {
                    me.enforceHeaderPopupTrap(popup);
                }, 1);
            }
            me.focusHeaderPopup(popup, config);
        }

        return popup;
    },
    bindHeaderPopupDocumentTrap: function () {
        if (this.leankorHeaderPopupDocumentTrapBound || !Ext.getDoc) {
            return;
        }

        this.leankorHeaderPopupTrapStack = this.leankorHeaderPopupTrapStack || [];
        this.leankorHeaderPopupDocumentTrapBound = true;
        Ext.getDoc().on('keydown', this.onHeaderPopupDocumentKeyDown, this);
        Ext.getDoc().on('focusin', this.onHeaderPopupDocumentFocusIn, this);
        Ext.getDoc().on('mousedown', this.onHeaderPopupDocumentPointerDown, this);
        Ext.getDoc().on('touchstart', this.onHeaderPopupDocumentPointerDown, this);
    },
    registerHeaderPopupTrap: function (popup) {
        var stack = this.leankorHeaderPopupTrapStack || [],
        activeElement = document.activeElement;

        if (!popup || popup.destroyed || !popup.el) {
            return;
        }

        if (
            !popup.leankorHeaderPopupPreviousFocus &&
            activeElement &&
            !popup.el.contains(activeElement) &&
            !this.isHeaderPopupOwnedFloatingTarget(popup, activeElement)) {
            popup.leankorHeaderPopupPreviousFocus = activeElement;
        }

        Ext.Array.remove(stack, popup);
        stack.push(popup);
        this.leankorHeaderPopupTrapStack = stack;
    },
    unregisterHeaderPopupTrap: function (popup) {
        if (this.leankorHeaderPopupTrapStack) {
            Ext.Array.remove(this.leankorHeaderPopupTrapStack, popup);
        }
    },
    getActiveHeaderPopupTrap: function () {
        var stack = this.leankorHeaderPopupTrapStack || [],
        popup,
        i;

        for (i = stack.length - 1; i >= 0; i--) {
            popup = stack[i];
            if (
                popup &&
                !popup.destroyed &&
                popup.el &&
                popup.el.dom &&
                (!popup.isVisible || popup.isVisible())) {
                return popup;
            }
        }

        return null;
    },
    onHeaderPopupDocumentKeyDown: function (e, target) {
        var me = this,
        popup = me.getActiveHeaderPopupTrap(),
        tabKey = Ext.EventObject.TAB || 9,
        key = e.getKey && e.getKey();

        if (!popup || key !== tabKey) {
            return;
        }

        if (
            !popup.el.contains(target) &&
            !me.isHeaderPopupOwnedFloatingTarget(popup, target)) {
            e.stopEvent();
            me.focusHeaderPopupEdge(popup, e.shiftKey);
            return;
        }

        if (me.trapHeaderPopupFocus(popup, e, target)) {
            return false;
        }

        // Some Ext grid/button internals move focus after our keydown handler.
        // Re-check immediately after native Tab navigation and pull focus back in
        // if it escaped the active popup.
        Ext.defer(function () {
            if (me.getActiveHeaderPopupTrap() === popup) {
                me.enforceHeaderPopupTrap(popup);
            }
        }, 1);
    },
    onHeaderPopupDocumentFocusIn: function (e, target) {
        var popup = this.getActiveHeaderPopupTrap();

        if (
            !popup ||
            !target ||
            popup.el.contains(target) ||
            popup.leankorHeaderPopupRestoringFocus ||
            this.isHeaderPopupOwnedFloatingTarget(popup, target)) {
            return;
        }

        this.focusHeaderPopupEdge(popup, false);
    },
    onHeaderPopupDocumentPointerDown: function (e, target) {
        var me = this,
        popup = me.getActiveHeaderPopupTrap();

        if (
            !popup ||
            !target ||
            popup.el.contains(target) ||
            me.isHeaderPopupOwnedFloatingTarget(popup, target)) {
            return;
        }

        // Keep existing outside-click close behavior intact. If the click does not
        // close the popup, restore focus back into the active popup after it settles.
        Ext.defer(function () {
            if (me.getActiveHeaderPopupTrap() === popup) {
                me.focusHeaderPopupEdge(popup, false);
            }
        }, 25);
    },
    enforceHeaderPopupTrap: function (popup) {
        var activeElement = document.activeElement;

        if (
            !popup ||
            popup.destroyed ||
            !popup.el ||
            !popup.el.dom ||
            !activeElement ||
            popup.el.contains(activeElement) ||
            this.isHeaderPopupOwnedFloatingTarget(popup, activeElement)) {
            return;
        }

        this.focusHeaderPopupEdge(popup, false);
    },
    ensureHeaderPopupFocusGuards: function (popup) {
        var me = this,
        dom = popup && popup.el && popup.el.dom,
        guardStyle =
            'height:1px;width:1px;overflow:hidden;opacity:0;position:absolute;left:-10000px;top:auto;';

        if (!dom || popup.leankorHeaderFocusGuardsBound) {
            return;
        }

        popup.leankorHeaderFocusGuardsBound = true;
        popup.leankorHeaderFocusStartGuard = Ext.DomHelper.insertFirst(
                dom, {
                tag: 'div',
                cls: 'lk-popup-focus-guard',
                tabindex: '0',
                'aria-hidden': 'true',
                style: guardStyle
            },
                true);
        popup.leankorHeaderFocusEndGuard = Ext.DomHelper.append(
                dom, {
                tag: 'div',
                cls: 'lk-popup-focus-guard',
                tabindex: '0',
                'aria-hidden': 'true',
                style: guardStyle
            },
                true);

        popup.leankorHeaderFocusStartGuard.on('focus', function () {
            if (me.getActiveHeaderPopupTrap() === popup) {
                me.focusHeaderPopupEdge(popup, true);
            }
        });
        popup.leankorHeaderFocusEndGuard.on('focus', function () {
            if (me.getActiveHeaderPopupTrap() === popup) {
                me.focusHeaderPopupEdge(popup, false);
            }
        });
    },
    focusHeaderPopupEdge: function (popup, reverse) {
        var focusables = this.getHeaderPopupFocusableElements(popup),
        element = reverse ? focusables[focusables.length - 1] : focusables[0];

        if (!element && popup.el && popup.el.dom) {
            popup.el.dom.setAttribute('tabindex', '-1');
            element = popup.el.dom;
        }

        this.focusHeaderPopupElement(popup, element);
    },
    isHeaderPopupOwnedFloatingTarget: function (popup, target) {
        var targetEl = target && Ext.fly(target),
        boundList = targetEl && targetEl.up('.x-boundlist', null, true),
        combo;

        if (!boundList || !popup || !popup.query) {
            return false;
        }

        combo = Ext.Array.findBy(popup.query('combo'), function (field) {
            var picker = field && field.getPicker && field.getPicker();

            return !!(
                field &&
                field.isExpanded &&
                picker &&
                picker.el &&
                (picker.el.dom === boundList || picker.el.contains(boundList)));
        });

        return !!combo;
    },
    syncHeaderPopupDialogAccessibility: function (popup, config) {
        var dom = popup && popup.el && popup.el.dom,
        label;

        if (!dom) {
            return;
        }

        label = this.getHeaderPopupDialogLabel(popup, config);
        dom.setAttribute('role', 'dialog');
        dom.setAttribute('aria-modal', 'true');
        if (label) {
            dom.setAttribute('aria-label', label);
        }
    },
    getHeaderPopupDialogLabel: function (popup, config) {
        var label =
            (config && config.label) ||
        (popup && (popup.ariaLabel || popup.title || popup.headerTitle)) ||
        (popup && popup.getTitle && popup.getTitle()) ||
        '';

        return this.cleanAriaText(label);
    },
    syncHeaderPopupTools: function (popup) {
        if (!popup || !popup.query) {
            return;
        }

        Ext.Array.forEach(
            popup.query('tool'),
            function (tool) {
            this.syncPopupToolAccessibility(tool, popup);
        },
            this);
    },
    syncHeaderPopupCloseToolDom: function (popup, config) {
        var me = this,
        label =
            (popup && popup.closeToolText) ||
        (typeof Locale !== 'undefined' &&
            Locale.LocaleName &&
            Locale.LocaleName.CloseDialog) ||
        'Close';

        if (!popup || !popup.el || !popup.el.dom) {
            return;
        }

        label = this.cleanAriaText(label);

        popup.el.select('.x-tool-close').each(function (toolEl) {
            var parentTool = toolEl.up('.x-tool'),
            focusEl = parentTool && parentTool.dom ? parentTool: toolEl;

            focusEl.dom.setAttribute('data-lk-close-tool', 'true');
            focusEl.dom.setAttribute('tabindex', '0');
            focusEl.dom.setAttribute('role', 'button');
            focusEl.dom.setAttribute('aria-label', label);
            focusEl.dom.setAttribute('title', label);
            me.bindHeaderPopupCloseToolElementKeys(
                popup,
                config || popup.leankorHeaderPopupConfig || {},
                focusEl);

            if (toolEl.dom !== focusEl.dom) {
                toolEl.dom.setAttribute('data-lk-close-tool-icon', 'true');
                toolEl.dom.setAttribute('tabindex', '-1');
                toolEl.dom.setAttribute('role', 'presentation');
                toolEl.dom.setAttribute('aria-label', label);
                toolEl.dom.setAttribute('title', label);
            }
            toolEl.select('.x-tool-tool-el, .x-tool-img').each(function (childEl) {
                childEl.dom.setAttribute('tabindex', '-1');
                childEl.dom.setAttribute('role', 'presentation');
            });
        });
    },
    bindHeaderPopupCloseToolElementKeys: function (popup, config, focusEl) {
        var me = this;

        if (
            !popup ||
            !focusEl ||
            !focusEl.dom ||
            focusEl.dom.leankorCloseToolElementKeysBound) {
            return;
        }

        focusEl.dom.leankorCloseToolElementKeysBound = true;
        focusEl.on('keydown', function (e) {
            var key = e.getKey && e.getKey(),
            enterKey = Ext.EventObject.ENTER || 13,
            spaceKey = Ext.EventObject.SPACE || 32;

            if (key !== enterKey && key !== spaceKey) {
                return true;
            }

            e.stopEvent();
            me.closeHeaderPopup(
                popup,
                config || popup.leankorHeaderPopupConfig || {},
                e);
            return false;
        });
    },
    bindHeaderPopupCloseToolDomKeys: function (popup, config) {
        var me = this;

        if (!popup || !popup.el || popup.leankorCloseToolDomKeysBound) {
            return;
        }

        popup.leankorCloseToolDomKeysBound = true;
        popup.el.on('keydown', function (e, target) {
            var key = e.getKey && e.getKey(),
            enterKey = e.ENTER || Ext.EventObject.ENTER || 13,
            spaceKey = e.SPACE || Ext.EventObject.SPACE || 32,
            targetEl = target && Ext.fly(target),
            markedCloseTool =
                targetEl &&
                (targetEl.is("[data-lk-close-tool='true']") ||
                    targetEl.up("[data-lk-close-tool='true']", popup.el, true)),
            toolEl =
                targetEl &&
                (targetEl.is('.x-tool')
                     ? targetEl: targetEl.up('.x-tool', popup.el)),
            closeTool =
                targetEl &&
                (markedCloseTool ||
                    targetEl.is('.x-tool-close') ||
                    targetEl.up('.x-tool-close', popup.el, true) ||
                    (toolEl && toolEl.down('.x-tool-close')));

            if (!closeTool || (key !== enterKey && key !== spaceKey)) {
                return true;
            }

            e.stopEvent();
            me.closeHeaderPopup(
                popup,
                config || popup.leankorHeaderPopupConfig || {},
                e);
            return false;
        });
    },
    bindPrintPopupAccessibility: function (popup, config) {
        var me = this,
        sync;

        if (!popup || popup.leankorPrintAccessibilityBound) {
            return popup;
        }

        config = config || {};
        popup.leankorPrintAccessibilityBound = true;
        sync = Ext.Function.createBuffered(function () {
            me.syncPrintPopupAccessibility(popup, config);
        }, 25);

        popup.on({
            afterrender: sync,
            show: sync,
            afterlayout: sync,
            scope: me
        });

        if (popup.rendered) {
            sync();
        }

        return popup;
    },
    syncPrintPopupAccessibility: function (popup, config) {
        var label =
            (config && config.label) ||
        (typeof Locale !== 'undefined' &&
            Locale.LocaleName &&
            Locale.LocaleName.PrintSetting) ||
        'Print settings';

        if (!popup || popup.destroyed) {
            return;
        }

        if (popup.el && popup.el.dom) {
            popup.el.dom.setAttribute('role', 'dialog');
            popup.el.dom.setAttribute('aria-modal', 'true');
            popup.el.dom.setAttribute('aria-label', label);
        }

        Ext.Array.forEach(
            popup.query('field'),
            function (field) {
            this.syncPopupFieldAccessibility(field);
        },
            this);

        Ext.Array.forEach(
            popup.query('button'),
            function (button) {
            this.syncPopupButtonAccessibility(button);
        },
            this);

        Ext.Array.forEach(
            popup.query('tool'),
            function (tool) {
            this.syncPopupToolAccessibility(tool, popup);
        },
            this);
    },
    onHeaderPopupKeyDown: function (popup, config, e, target) {
        var key = e.getKey(),
        button,
        spaceKey = e.SPACE || Ext.EventObject.SPACE || 32,
        record;

        if (key === (Ext.EventObject.TAB || 9) && config.trapFocus !== false) {
            e.stopEvent();
            if (!this.focusHeaderPopupAdjacentElement(popup, target, e.shiftKey)) {
                this.focusHeaderPopupEdge(popup, e.shiftKey);
            }
            return false;
        }

        if (
            config.activateRows &&
            this.handleHeaderPopupArrowNavigation(popup, config, e, target)) {
            return false;
        }

        if (
            key === (Ext.EventObject.TAB || 9) &&
            config.activateRows &&
            this.isHeaderPopupRowTarget(popup, target)) {
            if (this.focusHeaderPopupAdjacentElement(popup, target, e.shiftKey)) {
                e.stopEvent();
                return false;
            }
        }

        if (
            key === (Ext.EventObject.TAB || 9) &&
            !e.shiftKey &&
            this.isHeaderPopupPrimaryButtonTarget(popup, config, target)) {
            if (this.focusHeaderPopupAdjacentElement(popup, target, false)) {
                e.stopEvent();
                return false;
            }
        }

        if (
            key === (Ext.EventObject.TAB || 9) &&
            e.shiftKey &&
            this.isHeaderPopupCloseTool(target, popup)) {
            if (this.focusHeaderPopupAdjacentElement(popup, target, true)) {
                e.stopEvent();
                return false;
            }
        }

        if (
            config.skipEmptyRowsOnTab &&
            key === (Ext.EventObject.TAB || 9) &&
            !this.hasHeaderPopupRows(popup)) {
            if (!e.shiftKey && this.isHeaderPopupTextInput(target)) {
                button = this.getHeaderPopupPrimaryButton(popup, config);
                if (button && button.focus) {
                    e.stopEvent();
                    button.focus();
                    return false;
                }
            } else if (
                e.shiftKey &&
                this.isHeaderPopupPrimaryButtonTarget(popup, config, target)) {
                e.stopEvent();
                this.focusHeaderPopupCloseTool(popup);
                return false;
            } else if (
                !e.shiftKey &&
                this.isHeaderPopupPrimaryButtonTarget(popup, config, target)) {
                e.stopEvent();
                this.focusHeaderPopupCloseTool(popup);
                return false;
            } else if (this.isHeaderPopupCloseTool(target, popup)) {
                e.stopEvent();
                if (e.shiftKey) {
                    button = this.getHeaderPopupPrimaryButton(popup, config);
                    if (button && button.focus) {
                        button.focus();
                    }
                } else {
                    this.focusHeaderPopup(popup, {
                        focusQuery: 'textfield'
                    });
                }
                return false;
            }
        }

        if (config.activateRows && (key === e.ENTER || key === spaceKey)) {
            record =
                this.getHeaderPopupRecordFromTarget(popup, target) ||
                this.getHeaderPopupRecord(popup);
            if (record) {
                e.stopEvent();
                if (Ext.isFunction(config.rowEnterHandler)) {
                    config.rowEnterHandler.call(
                        config.scope || this,
                        popup,
                        record,
                        e,
                        target);
                    return false;
                }
                if (this.toggleHeaderPopupTreeRecord(popup, record)) {
                    return false;
                }
                this.toggleHeaderPopupRecord(popup, record);
                this.syncResourceTypePopupAccessibility(popup, config);
                return false;
            }
        }

        if (
            (key === e.ENTER || key === spaceKey) &&
            !this.isHeaderPopupTextInput(target)) {
            button = this.getHeaderPopupButtonFromTarget(popup, target);
            if (button) {
                e.stopEvent();
                this.fireHeaderPopupButton(button, e);
                return false;
            }
        }

        if (
            (key === e.ENTER || key === spaceKey) &&
            this.isHeaderPopupCloseTool(target, popup)) {
            e.stopEvent();
            this.closeHeaderPopup(popup, config, e);
            return false;
        }

        if (
            key !== e.ENTER ||
            this.isHeaderPopupTextInput(target) ||
            (target && Ext.fly(target).up('.x-btn'))) {
            return true;
        }

        if (Ext.isFunction(config.enterHandler)) {
            e.stopEvent();
            config.enterHandler.call(config.scope || this, popup, e, target);
            return false;
        }

        button = this.getHeaderPopupPrimaryButton(popup, config);

        if (button) {
            e.stopEvent();
            this.fireHeaderPopupButton(button, e);
            return false;
        }

        return true;
    },
    getHeaderPopupButtonFromTarget: function (popup, target) {
        var button;

        if (!popup || !target) {
            return null;
        }

        button = Ext.Component.fromElement(target, popup.el, 'button');
        if (
            button &&
            !(button.isDisabled && button.isDisabled()) &&
            !button.hidden) {
            return button;
        }

        return null;
    },
    isHeaderPopupRowTarget: function (popup, target) {
        var view = popup && popup.getView && popup.getView(),
        rowSelector = view && (view.rowSelector || view.itemSelector);

        return !!(
            view &&
            view.el &&
            target &&
            rowSelector &&
            (Ext.fly(target).is(rowSelector) ||
                Ext.fly(target).up(rowSelector, view.el, true) ||
                target === view.el.dom));
    },
    handleHeaderPopupArrowNavigation: function (popup, config, e, target) {
        var key = e.getKey && e.getKey(),
        upKey = Ext.EventObject.UP || 38,
        downKey = Ext.EventObject.DOWN || 40,
        leftKey = Ext.EventObject.LEFT || 37,
        rightKey = Ext.EventObject.RIGHT || 39,
        view = popup && popup.getView && popup.getView(),
        record;

        if (
            this.isHeaderPopupTextInput(target) ||
            !view ||
            !view.el ||
            !this.isHeaderPopupRowTarget(popup, target)) {
            return false;
        }

        if (key === upKey || key === downKey) {
            e.stopEvent();
            this.focusHeaderPopupSiblingRow(popup, target, key === downKey ? 1 : -1);
            return true;
        }

        if (
            !(popup.isXType && popup.isXType('treepanel')) ||
            (key !== leftKey && key !== rightKey)) {
            return false;
        }

        record = this.getHeaderPopupRecordFromTarget(popup, target);
        if (!record) {
            return false;
        }

        if (key === rightKey && record.isLeaf && !record.isLeaf()) {
            e.stopEvent();
            if (!(record.isExpanded && record.isExpanded())) {
                this.toggleHeaderPopupTreeRecord(popup, record);
            }
            return true;
        }

        if (key === leftKey) {
            e.stopEvent();
            if (
                record.isLeaf &&
                !record.isLeaf() &&
                record.isExpanded &&
                record.isExpanded()) {
                record.collapse();
                this.syncResourceTypePopupAccessibility(
                    popup,
                    popup.leankorResourceTypeAccessibilityConfig || config || {});
            } else {
                this.focusHeaderPopupParentRow(popup, record);
            }
            return true;
        }

        return false;
    },
    getHeaderPopupRowElements: function (popup) {
        var view = popup && popup.getView && popup.getView(),
        selector = view && (view.rowSelector || view.itemSelector),
        rows = [];

        if (!view || !view.el || !selector) {
            return rows;
        }

        view.el.select(selector).each(function (rowEl) {
            var focusEl = rowEl && this.getHeaderPopupRowFocusElement(rowEl.dom);

            if (
                focusEl &&
                focusEl.offsetParent !== null &&
                focusEl.getAttribute('aria-hidden') !== 'true') {
                rows.push(focusEl);
            }
        }, this);

        return rows;
    },
    getHeaderPopupRowFocusElement: function (row) {
        var rowEl = row && Ext.fly(row),
        inner = rowEl && rowEl.down('.x-grid-cell-inner', true);

        return inner || row || null;
    },
    setHeaderPopupActiveRowTabIndex: function (popup, activeRow) {
        var view = popup && popup.getView && popup.getView(),
        selector = view && (view.rowSelector || view.itemSelector);

        if (!view || !view.el || !selector) {
            return;
        }

        view.el.select(selector).each(function (rowEl) {
            var focusEl = this.getHeaderPopupRowFocusElement(rowEl.dom);

            if (focusEl) {
                focusEl.setAttribute('tabindex', rowEl.dom === activeRow ? '0' : '-1');
            }
        }, this);
    },
    getHeaderPopupRowElementFromTarget: function (popup, target) {
        var view = popup && popup.getView && popup.getView(),
        selector = view && (view.rowSelector || view.itemSelector),
        row;

        if (!view || !view.el || !selector || !target) {
            return null;
        }

        row = Ext.fly(target).is(selector)
             ? target: Ext.fly(target).up(selector, view.el, true);

        return row || null;
    },
    focusHeaderPopupSiblingRow: function (popup, target, direction) {
        var rows = this.getHeaderPopupRowElements(popup),
        currentRow = this.getHeaderPopupRowElementFromTarget(popup, target),
        currentFocusEl = this.getHeaderPopupRowFocusElement(currentRow),
        index = currentFocusEl ? Ext.Array.indexOf(rows, currentFocusEl) : -1,
        nextIndex;

        if (!rows.length) {
            return false;
        }

        nextIndex = index + direction;
        if (nextIndex < 0) {
            nextIndex = rows.length - 1;
        } else if (nextIndex >= rows.length) {
            nextIndex = 0;
        }

        this.focusHeaderPopupElement(popup, rows[nextIndex]);
        return true;
    },
    focusHeaderPopupParentRow: function (popup, record) {
        var view = popup && popup.getView && popup.getView(),
        parentRecord = record && record.parentNode,
        parentNode;

        if (
            !view ||
            !parentRecord ||
            (parentRecord.isRoot && parentRecord.isRoot())) {
            return false;
        }

        parentNode = view.getNode && view.getNode(parentRecord);
        if (parentNode) {
            this.focusHeaderPopupElement(
                popup,
                this.getHeaderPopupRowFocusElement(parentNode));
            return true;
        }

        return false;
    },
    trapHeaderPopupFocus: function (popup, e, target) {
        var focusables = this.getHeaderPopupFocusableElements(popup),
        first = focusables[0],
        last = focusables[focusables.length - 1];

        if (!first || !last) {
            return false;
        }

        if (e.shiftKey && this.isTargetInsideElement(target, first)) {
            e.stopEvent();
            this.focusHeaderPopupElement(popup, last);
            return true;
        }

        if (!e.shiftKey && this.isTargetInsideElement(target, last)) {
            e.stopEvent();
            this.focusHeaderPopupElement(popup, first);
            return true;
        }

        return false;
    },
    focusHeaderPopupAdjacentElement: function (popup, target, reverse) {
        var focusables = this.getHeaderPopupFocusableElements(popup),
        index = -1,
        nextIndex,
        attempts = 0,
        i;

        for (i = 0; i < focusables.length; i++) {
            if (this.isTargetInsideElement(target, focusables[i])) {
                index = i;
                break;
            }
        }

        if (focusables.length < 2) {
            return false;
        }

        if (index === -1) {
            this.focusHeaderPopupElement(
                popup,
                reverse ? focusables[focusables.length - 1] : focusables[0]);
            return true;
        }

        nextIndex = reverse ? index - 1 : index + 1;

        do {
            if (nextIndex < 0) {
                nextIndex = focusables.length - 1;
            } else if (nextIndex >= focusables.length) {
                nextIndex = 0;
            }

            if (!this.isSameHeaderPopupFocusGroup(target, focusables[nextIndex])) {
                break;
            }

            nextIndex = reverse ? nextIndex - 1 : nextIndex + 1;
            attempts++;
        } while (attempts < focusables.length);

        if (attempts >= focusables.length) {
            return false;
        }

        this.focusHeaderPopupElement(popup, focusables[nextIndex]);
        return true;
    },
    isSameHeaderPopupFocusGroup: function (target, element) {
        var targetGroup,
        elementGroup;

        if (!target || !element || target === element) {
            return target === element;
        }

        targetGroup = Ext.fly(target).is('.x-btn, .x-tool')
             ? target: Ext.fly(target).up('.x-btn, .x-tool', null, true);
        elementGroup = Ext.fly(element).is('.x-btn, .x-tool')
             ? element: Ext.fly(element).up('.x-btn, .x-tool', null, true);

        return !!(targetGroup && elementGroup && targetGroup === elementGroup);
    },
    getHeaderPopupFocusableElements: function (popup) {
        var elements = [],
        popupEl = popup && popup.el,
        view = popup && popup.getView && popup.getView(),
        rows,
        activeElement = document.activeElement,
        closeTool,
        addElement,
        isUsable;

        if (!popupEl || !popupEl.dom) {
            return elements;
        }

        isUsable = function (dom) {
            return !!(
                dom &&
                dom.getAttribute &&
                dom.offsetParent !== null &&
                !dom.disabled &&
                dom.getAttribute('aria-hidden') !== 'true' &&
                dom.getAttribute('aria-disabled') !== 'true' &&
                !Ext.fly(dom).hasCls('lk-popup-focus-guard') &&
                !Ext.fly(dom).hasCls('x-item-disabled') &&
                !Ext.fly(dom).hasCls('x-btn-disabled') &&
                !Ext.fly(dom).up('.x-item-disabled', popupEl, true) &&
                !Ext.fly(dom).up('.x-btn-disabled', popupEl, true));
        };

        addElement = function (dom) {
            if (isUsable(dom) && Ext.Array.indexOf(elements, dom) === -1) {
                elements.push(dom);
            }
        };

        Ext.Array.forEach(
            popup.query ? popup.query('field') : [],
            function (field) {
            if (
                field &&
                !(field.isDisabled && field.isDisabled()) &&
                !field.hidden) {
                addElement(
                    (field.inputEl && field.inputEl.dom) || (field.el && field.el.dom));
            }
        });

        rows = view && this.getHeaderPopupRowElements(popup);
        if (rows && rows.length) {
            var activeRow = Ext.Array.findBy(
                    rows,
                    function (row) {
                    return this.isTargetInsideElement(activeElement, row);
                },
                    this);

            addElement(activeRow || rows[0]);
        }

        Ext.Array.forEach(
            popup.query ? popup.query('button') : [],
            function (button) {
            if (
                button &&
                !(button.isDisabled && button.isDisabled()) &&
                !button.hidden) {
                addElement(button.el && button.el.dom);
            }
        });

        closeTool = this.getHeaderPopupCloseToolElement(popup);
        addElement(closeTool);

        return elements;
    },
    isTargetInsideElement: function (target, element) {
        return !!(
            target &&
            element &&
            (target === element || Ext.fly(element).contains(target)));
    },
    focusHeaderPopupElement: function (popup, element) {
        var view = popup && popup.getView && popup.getView(),
        row =
            view &&
            element &&
            this.getHeaderPopupRowElementFromTarget(popup, element),
        record = row && view.getRecord && view.getRecord(row),
        selectionModel =
            popup && popup.getSelectionModel && popup.getSelectionModel();

        if (row) {
            this.setHeaderPopupActiveRowTabIndex(popup, row);
        }

        if (record && selectionModel && selectionModel.select) {
            selectionModel.select(record, false, true);
        }

        if (popup) {
            popup.leankorHeaderPopupRestoringFocus = true;
        }

        Ext.defer(function () {
            if (element && element.focus) {
                element.focus();
            }
            if (popup) {
                popup.leankorHeaderPopupRestoringFocus = false;
            }
        }, 1);
    },
    getHeaderPopupPrimaryButton: function (popup, config) {
        var button = null;

        config = config || {};

        if (config.primaryButtonItemId) {
            button = popup.down('#' + config.primaryButtonItemId);
        }

        if (!button && config.primaryButtonQuery) {
            button = popup.down(config.primaryButtonQuery);
        }

        return button;
    },
    hasHeaderPopupRows: function (popup) {
        var view = popup && popup.getView && popup.getView(),
        store = popup && popup.getStore && popup.getStore(),
        selector =
            view && (view.rowSelector || view.itemSelector || '.x-grid-item');

        if (store && store.getCount) {
            return store.getCount() > 0;
        }

        return !!(view && view.el && selector && view.el.down(selector));
    },
    isHeaderPopupPrimaryButtonTarget: function (popup, config, target) {
        var button = this.getHeaderPopupPrimaryButton(popup, config);

        return !!(
            button &&
            button.el &&
            target &&
            (target === button.el.dom || button.el.contains(target)));
    },
    closeHeaderPopupOnEscape: function (popup, config, e, target) {
        var combo = target && Ext.Component.fromElement(target, popup.el, 'combo');

        if (combo && combo.isExpanded) {
            combo.collapse();
            return;
        }

        this.closeHeaderPopup(popup, config, e);
    },
    closeHeaderPopup: function (popup, config, e) {
        var button;

        if (config.escapeButtonItemId) {
            button = popup.down('#' + config.escapeButtonItemId);
        }

        if (button) {
            this.fireHeaderPopupButton(button, e);
        } else if (popup.close) {
            popup.close();
        } else if (popup.hide) {
            popup.hide();
        }

        this.restoreHeaderPopupFocus(config, popup);
    },
    restoreHeaderPopupFocus: function (config, popup) {
        var focusTarget =
            (config && config.focusTarget) ||
        (popup && popup.leankorHeaderPopupPreviousFocus);

        if (popup) {
            popup.leankorHeaderPopupPreviousFocus = null;
        }

        if (
            !focusTarget ||
            focusTarget.destroyed ||
            (focusTarget.nodeType === 1 &&
                !document.documentElement.contains(focusTarget)) ||
            (focusTarget.isDisabled && focusTarget.isDisabled())) {
            return;
        }

        Ext.defer(function () {
            if (
                focusTarget.destroyed ||
                (focusTarget.nodeType === 1 &&
                    !document.documentElement.contains(focusTarget)) ||
                (focusTarget.isDisabled && focusTarget.isDisabled())) {
                return;
            }

            if (focusTarget.focus) {
                focusTarget.focus();
            } else if (focusTarget.el && focusTarget.el.dom) {
                focusTarget.el.dom.focus();
            } else if (focusTarget.nodeType === 1) {
                focusTarget.focus();
            }
        }, 25);
    },
    fireHeaderPopupButton: function (button, e) {
        if (
            !button ||
            button.destroyed ||
            (button.isDisabled && button.isDisabled()) ||
            button.hidden) {
            return;
        }

        if (button.fireHandler) {
            button.fireHandler(e);
        } else if (button.handler) {
            Ext.callback(
                button.handler,
                button.scope || button,
                [button, e],
                0,
                button);
        }
    },
    focusHeaderPopup: function (popup, config) {
        var me = this,
        target = config.focusQuery && popup.down(config.focusQuery),
        view,
        rows,
        button;

        Ext.defer(function () {
            if (target && target.focus) {
                target.focus();
                return;
            }

            view = popup.getView && popup.getView();
            rows = view && me.getHeaderPopupRowElements(popup);
            if (rows && rows.length) {
                me.focusHeaderPopupElement(popup, rows[0]);
            } else if (view && view.el && view.el.dom) {
                view.el.dom.setAttribute('tabindex', '-1');
                button = me.getHeaderPopupPrimaryButton(popup, config || {});
                if (button && button.el && button.el.dom) {
                    me.focusHeaderPopupElement(popup, button.el.dom);
                } else if (button && button.focus) {
                    me.focusHeaderPopupElement(popup, button.el && button.el.dom);
                } else if (popup.focus) {
                    popup.focus();
                }
            } else if (popup.focus) {
                popup.focus();
            }
        }, 50);
    },
    isHeaderPopupTextInput: function (target) {
        var tagName = target && target.tagName;

        tagName = tagName && tagName.toLowerCase();

        return (
            tagName === 'input' ||
            tagName === 'textarea' ||
            tagName === 'select' ||
            !!(target && target.isContentEditable));
    },
    isHeaderPopupTool: function (target) {
        return !!(
            target &&
            (Ext.fly(target).is('.x-tool') || Ext.fly(target).up('.x-tool')));
    },
    getHeaderPopupCloseToolElement: function (popup) {
        var closeTool;

        if (!popup || !popup.el || !popup.el.dom) {
            return null;
        }

        closeTool = null;
        popup.el
        .select("[data-lk-close-tool='true'], .x-tool-close")
        .each(function (toolEl) {
            var parentTool =
                toolEl &&
                !toolEl.is("[data-lk-close-tool='true']") &&
                toolEl.up('.x-tool'),
            dom =
                (parentTool && parentTool.dom && parentTool.dom) ||
            (toolEl && toolEl.dom);

            if (
                !closeTool &&
                dom &&
                dom.offsetParent !== null &&
                dom.getAttribute('aria-hidden') !== 'true') {
                closeTool = dom;
            }
        });

        return closeTool;
    },
    focusHeaderPopupCloseTool: function (popup) {
        var closeTool = this.getHeaderPopupCloseToolElement(popup);

        if (closeTool) {
            this.focusHeaderPopupElement(popup, closeTool);
            return true;
        }

        this.focusHeaderPopupEdge(popup, true);
        return false;
    },
    isHeaderPopupCloseTool: function (target, popup) {
        var targetEl = target && Ext.fly(target),
        toolEl;

        if (!targetEl) {
            return false;
        }

        toolEl = targetEl.is('.x-tool')
             ? targetEl: targetEl.up('.x-tool', popup && popup.el);

        return !!(
            targetEl.is("[data-lk-close-tool='true']") ||
            targetEl.up("[data-lk-close-tool='true']", popup && popup.el, true) ||
            targetEl.is('.x-tool-close') ||
            targetEl.up('.x-tool-close', popup && popup.el, true) ||
            (toolEl &&
                (toolEl.hasCls('x-tool-close') || toolEl.down('.x-tool-close'))));
    },
    getHeaderPopupRecord: function (popup) {
        var view = popup.getView && popup.getView(),
        navigationModel =
            view && view.getNavigationModel && view.getNavigationModel(),
        selectionModel = popup.getSelectionModel && popup.getSelectionModel(),
        selected =
            selectionModel &&
            selectionModel.getSelection &&
            selectionModel.getSelection();

        return (
            (navigationModel &&
                navigationModel.getRecord &&
                navigationModel.getRecord()) ||
            (selected && selected[0]));
    },
    getHeaderPopupRecordFromTarget: function (popup, target) {
        var view = popup && popup.getView && popup.getView(),
        rowSelector = view && (view.rowSelector || view.itemSelector),
        row;

        if (!view || !target || !rowSelector) {
            return null;
        }

        row = Ext.fly(target).is(rowSelector)
             ? target: Ext.fly(target).up(rowSelector, view.el, true);

        return (row && view.getRecord && view.getRecord(row)) || null;
    },
    toggleHeaderPopupRecord: function (popup, record) {
        var selectionModel =
            popup && popup.getSelectionModel && popup.getSelectionModel();

        if (!selectionModel || !record) {
            return;
        }

        if (selectionModel.isSelected && selectionModel.isSelected(record)) {
            selectionModel.deselect(record);
        } else {
            selectionModel.select(record, true);
        }
    },
    toggleHeaderPopupTreeRecord: function (popup, record) {
        var itemId = popup && popup.getItemId && popup.getItemId();

        if (
            !popup ||
            !record ||
            !record.isLeaf ||
            record.isLeaf() ||
            !(popup.isXType && popup.isXType('treepanel'))) {
            return false;
        }

        if (itemId === 'projectListGrid') {
            this.toggleProjectFilterFolder(popup, record);
        } else if (record.isExpanded && record.isExpanded()) {
            record.collapse();
        } else {
            record.expand();
        }

        this.syncResourceTypePopupAccessibility(
            popup,
            popup.leankorResourceTypeAccessibilityConfig || {});
        return true;
    },
    bindResourceTypePopupAccessibility: function (popup, config) {
        var me = this,
        sync;

        if (!popup || popup.leankorResourceTypeAccessibilityBound) {
            return popup;
        }

        config = config || {};
        popup.leankorResourceTypeAccessibilityBound = true;
        popup.leankorResourceTypeAccessibilityConfig = config;
        sync = Ext.Function.createBuffered(function () {
            me.syncResourceTypePopupAccessibility(popup, config);
        }, 25);

        popup.on({
            afterrender: function () {
                me.bindResourceTypePopupViewAccessibility(popup, config, sync);
                sync();
            },
            show: sync,
            afterlayout: sync,
            scope: me
        });

        if (popup.rendered) {
            me.bindResourceTypePopupViewAccessibility(popup, config, sync);
            sync();
        }

        return popup;
    },
    bindResourceTypePopupViewAccessibility: function (popup, config, sync) {
        var me = this,
        view = popup && popup.getView && popup.getView(),
        rowSelector;

        if (!view || !view.el || view.leankorResourceTypeAccessibilityBound) {
            return;
        }

        view.leankorResourceTypeAccessibilityBound = true;
        rowSelector = view.rowSelector || view.itemSelector || '.x-grid-item';

        view.el.dom.addEventListener(
            'keydown',
            function (event) {
            var key = event.key || event.keyCode,
            isTab = key === 'Tab' || key === 9,
            target = event.target;

            if (
                !isTab ||
                !me.isHeaderPopupRowTarget(popup, target) ||
                !me.focusHeaderPopupAdjacentElement(popup, target, event.shiftKey)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            if (event.stopImmediatePropagation) {
                event.stopImmediatePropagation();
            }
        },
            true);

        view.el.on(
            'focusin',
            function (e, target) {
            me.setResourceTypePopupRowFocus(view, target, true);
        },
            me, {
            delegate: rowSelector + ', .x-grid-cell-inner'
        });

        view.el.on(
            'focusout',
            function (e, target) {
            me.setResourceTypePopupRowFocus(view, target, false);
        },
            me, {
            delegate: rowSelector + ', .x-grid-cell-inner'
        });

        view.on({
            refresh: sync,
            itemadd: sync,
            itemupdate: sync,
            scope: me
        });

        popup.getSelectionModel().on('selectionchange', sync);
    },
    setResourceTypePopupRowFocus: function (view, target, focused) {
        var rowSelector = view.rowSelector || view.itemSelector || '.x-grid-item',
        row = Ext.fly(target).is(rowSelector)
             ? target: Ext.fly(target).up(rowSelector, view.el, true);

        if (row) {
            Ext.fly(row)[focused ? 'addCls' : 'removeCls']('lk-popup-row-focused');
        }
    },
    syncResourceTypePopupAccessibility: function (popup, config) {
        config = config || {};
        var label = config.label || this.getResourceTypePopupLabel(),
        searchLabel = config.searchLabel || this.getResourceTypeSearchLabel(),
        view = popup && popup.getView && popup.getView(),
        searchField = popup && popup.down && popup.down('textfield');

        if (!popup || popup.destroyed) {
            return;
        }

        if (popup.el && popup.el.dom) {
            popup.el.dom.setAttribute('role', 'dialog');
            popup.el.dom.setAttribute(
                'aria-modal',
                popup.modal === false ? 'false' : 'true');
            popup.el.dom.setAttribute('aria-label', label);
        }

        if (searchField) {
            searchField.ariaLabel = searchLabel;
            if (searchField.el && searchField.el.dom) {
                searchField.el.dom.setAttribute('aria-label', searchLabel);
            }
            if (searchField.inputEl && searchField.inputEl.dom) {
                searchField.inputEl.dom.setAttribute('aria-label', searchLabel);
            }
        }

        Ext.Array.forEach(
            popup.query('button'),
            function (button) {
            this.syncPopupButtonAccessibility(button);
        },
            this);

        Ext.Array.forEach(
            popup.query('tool'),
            function (tool) {
            this.syncPopupToolAccessibility(tool, popup);
        },
            this);

        if (view && view.el) {
            view.el.dom.setAttribute(
                'role',
                popup.isXType && popup.isXType('treepanel') ? 'tree' : 'listbox');
            view.el.dom.setAttribute('aria-multiselectable', 'true');
            view.el.dom.setAttribute('aria-label', label);
            view.el.dom.setAttribute('tabindex', '-1');
            this.syncResourceTypePopupRows(popup, view, config);
        }
    },
    syncResourceTypePopupRows: function (popup, view, config) {
        var me = this,
        selector = view.rowSelector || view.itemSelector || '.x-grid-item';

        view.el.select(selector).each(function (rowEl) {
            me.prepareResourceTypePopupRow(popup, view, rowEl, config);
        });
    },
    prepareResourceTypePopupRow: function (popup, view, rowEl, config) {
        var dom = rowEl && (rowEl.dom || rowEl),
        record = dom && view.getRecord && view.getRecord(dom),
        selectionModel = popup.getSelectionModel && popup.getSelectionModel(),
        selected = !!(
            record &&
            selectionModel &&
            selectionModel.isSelected &&
            selectionModel.isSelected(record)),
        label =
            this.getResourceTypeRecordLabel(record, config) ||
            this.getElementText(dom),
        role =
            popup.isXType && popup.isXType('treepanel') ? 'treeitem' : 'option',
        focusDom;

        if (!dom) {
            return;
        }

        focusDom = this.getHeaderPopupRowFocusElement(dom);

        dom.setAttribute('tabindex', '-1');
        dom.setAttribute('role', 'presentation');
        dom.setAttribute('aria-selected', selected ? 'true' : 'false');
        if (record && record.isLeaf && !record.isLeaf()) {
            dom.setAttribute(
                'aria-expanded',
                record.isExpanded && record.isExpanded() ? 'true' : 'false');
        } else {
            dom.removeAttribute('aria-expanded');
        }
        if (label) {
            dom.setAttribute('aria-label', label);
        }

        if (focusDom) {
            focusDom.setAttribute(
                'tabindex',
                this.isTargetInsideElement(document.activeElement, focusDom) ||
                Ext.fly(dom).hasCls('lk-popup-row-focused')
                 ? '0'
                 : '-1');
            focusDom.setAttribute('role', role);
            focusDom.setAttribute('aria-selected', selected ? 'true' : 'false');
            if (record && record.isLeaf && !record.isLeaf()) {
                focusDom.setAttribute(
                    'aria-expanded',
                    record.isExpanded && record.isExpanded() ? 'true' : 'false');
            } else {
                focusDom.removeAttribute('aria-expanded');
            }
            if (label) {
                focusDom.setAttribute('aria-label', label);
            }
        }

        Ext.fly(dom)
        .select('.x-grid-cell')
        .each(function (cellEl) {
            cellEl.dom.setAttribute('tabindex', '-1');
            cellEl.dom.setAttribute('role', 'presentation');
            if (label) {
                cellEl.dom.setAttribute('aria-label', label);
            }
        });

        Ext.fly(dom)
        .select('.x-grid-cell-inner')
        .each(function (innerEl) {
            if (!focusDom || innerEl.dom !== focusDom) {
                innerEl.dom.setAttribute('tabindex', '-1');
                innerEl.dom.setAttribute('role', 'presentation');
            }
        });
    },
    syncPopupButtonAccessibility: function (button) {
        var label = this.getPopupButtonLabel(button),
        disabled = button.isDisabled && button.isDisabled(),
        tabIndex = disabled ? '-1' : '0',
        focusEls;

        button.focusable = true;
        button.tabIndex = disabled ? -1 : 0;

        if (button.ariaEl && button.ariaEl.dom) {
            button.ariaEl.dom.setAttribute('aria-label', label);
            button.ariaEl.dom.setAttribute(
                'aria-disabled',
                disabled ? 'true' : 'false');
        }

        if (button.el && button.el.dom) {
            button.el.dom.setAttribute('tabindex', tabIndex);
            button.el.dom.setAttribute('role', 'button');
            button.el.dom.setAttribute('aria-label', label);
            button.el.dom.setAttribute('aria-disabled', disabled ? 'true' : 'false');
        }

        focusEls = [button.focusEl, button.ariaEl, button.btnEl, button.buttonEl];
        Ext.Array.forEach(focusEls, function (el) {
            if (el && el.dom) {
                el.dom.setAttribute('tabindex', '-1');
                el.dom.setAttribute('role', 'presentation');
                el.dom.setAttribute('aria-label', label);
                el.dom.setAttribute('aria-disabled', disabled ? 'true' : 'false');
            }
        });

        this.bindPopupButtonKeyboardHandler(button);
    },
    bindPopupButtonKeyboardHandler: function (button) {
        var me = this,
        focusEls;

        if (!button || button.leankorPopupButtonKeysBound) {
            return;
        }

        button.leankorPopupButtonKeysBound = true;
        focusEls = [
            button.el,
            button.focusEl,
            button.ariaEl,
            button.btnEl,
            button.buttonEl
        ];

        Ext.Array.forEach(focusEls, function (el) {
            if (!el || !el.dom || el.dom.leankorPopupButtonKeyHandlerBound) {
                return;
            }

            el.dom.leankorPopupButtonKeyHandlerBound = true;
            el.on('keydown', function (e) {
                var key = e.getKey && e.getKey(),
                enterKey = Ext.EventObject.ENTER || 13,
                spaceKey = Ext.EventObject.SPACE || 32;

                if (key !== enterKey && key !== spaceKey) {
                    return true;
                }

                e.stopEvent();
                me.fireHeaderPopupButton(button, e);
                return false;
            });
        });
    },
    syncPopupFieldAccessibility: function (field) {
        var label = this.getPopupFieldLabel(field),
        disabled = field.isDisabled && field.isDisabled();

        if (!field) {
            return;
        }

        field.focusable = true;
        field.tabIndex = disabled ? -1 : 0;

        if (field.ariaEl && field.ariaEl.dom) {
            field.ariaEl.dom.setAttribute('aria-label', label);
            field.ariaEl.dom.setAttribute(
                'aria-disabled',
                disabled ? 'true' : 'false');
        }

        if (field.el && field.el.dom) {
            field.el.dom.setAttribute('aria-label', label);
            field.el.dom.setAttribute('aria-disabled', disabled ? 'true' : 'false');
        }

        if (field.inputEl && field.inputEl.dom) {
            field.inputEl.dom.setAttribute('aria-label', label);
            field.inputEl.dom.setAttribute('tabindex', disabled ? '-1' : '0');
            field.inputEl.dom.setAttribute(
                'aria-disabled',
                disabled ? 'true' : 'false');
        }
    },
    syncPopupToolAccessibility: function (tool, popup) {
        var localeName = typeof Locale !== 'undefined' && Locale.LocaleName,
        isCloseTool = !tool.type || tool.type === 'close',
        label =
            tool.tooltip ||
            tool.closeToolText ||
            (popup && popup.closeToolText) ||
            (localeName && localeName.CloseDialog) ||
            'Close',
        focusEl,
        childEls;

        tool.focusable = true;
        tool.tabIndex = 0;
        label = this.cleanAriaText(label);

        focusEl =
            (isCloseTool && tool.el && tool.el.dom && tool.el) ||
        (isCloseTool &&
            tool.el &&
            tool.el.down &&
            tool.el.down('.x-tool-close')) ||
        (isCloseTool &&
            tool.toolEl &&
            tool.toolEl.hasCls &&
            tool.toolEl.hasCls('x-tool-close') &&
            tool.toolEl) ||
        (tool.el && tool.el.dom && tool.el) ||
        tool.focusEl ||
        tool.ariaEl;

        if (focusEl && focusEl.dom) {
            focusEl.dom.setAttribute('tabindex', '0');
            focusEl.dom.setAttribute('role', 'button');
            focusEl.dom.setAttribute('aria-label', label);
            focusEl.dom.setAttribute('title', label);
            this.bindPopupToolKeyboardHandler(tool, popup, focusEl);
        }

        childEls = [tool.toolEl, tool.focusEl, tool.ariaEl];

        Ext.Array.forEach(childEls, function (el) {
            if (el && el.dom && (!focusEl || el.dom !== focusEl.dom)) {
                el.dom.setAttribute('tabindex', '-1');
                el.dom.setAttribute('role', isCloseTool ? 'presentation' : 'button');
                el.dom.setAttribute('aria-label', label);
            }
        });

        if (
            isCloseTool &&
            tool.el &&
            tool.el.down &&
            focusEl &&
            tool.el.dom === focusEl.dom) {
            tool.el
            .select('.x-tool-close, .x-tool-tool-el, .x-tool-img')
            .each(function (childEl) {
                if (childEl && childEl.dom && childEl.dom !== focusEl.dom) {
                    childEl.dom.setAttribute('tabindex', '-1');
                    childEl.dom.setAttribute('role', 'presentation');
                }
            });
        }
    },
    bindPopupToolKeyboardHandler: function (tool, popup, focusEl) {
        var me = this,
        el = focusEl || (tool && tool.el);

        if (!tool || !popup || !el || !el.dom || tool.leankorPopupToolKeysBound) {
            return;
        }

        tool.leankorPopupToolKeysBound = true;
        el.on('keydown', function (e) {
            var key = e.getKey && e.getKey(),
            spaceKey = e.SPACE || Ext.EventObject.SPACE || 32;

            if (key !== e.ENTER && key !== spaceKey) {
                return true;
            }

            e.stopEvent();
            me.closeHeaderPopup(popup, popup.leankorHeaderPopupConfig || {}, e);
            return false;
        });
    },
    getPopupButtonLabel: function (button) {
        var localeName = typeof Locale !== 'undefined' && Locale.LocaleName,
        itemId = button && button.getItemId && button.getItemId(),
        label = button && (button.tooltip || button.text);

        if (!label && itemId === 'userGridPreviousButton') {
            label = (localeName && localeName.PreviousTimespan) || 'Previous page';
        } else if (!label && itemId === 'userGridNextButton') {
            label = (localeName && localeName.NextTimespan) || 'Next page';
        }

        return this.cleanAriaText(label || itemId || 'Button');
    },
    getPopupFieldLabel: function (field) {
        var label =
            field &&
            (field.fieldLabel ||
                field.boxLabel ||
                field.emptyText ||
                field.name ||
                field.getItemId());

        return this.cleanAriaText(label || 'Field');
    },
    getResourceTypeRecordLabel: function (record, config) {
        var localeName = typeof Locale !== 'undefined' && Locale.LocaleName,
        prefix =
            (config && config.recordLabelPrefix) ||
        (localeName && localeName.ResourceTypes) ||
        'Resource type',
        name =
            record &&
            ((record.get && (record.get('name') || record.get('Name'))) ||
                (record.data && (record.data.name || record.data.Name)));

        return name
         ? prefix +
        ': ' +
        Ext.String.htmlDecode(String(name).replace(/<[^>]*>/g, ''))
         : '';
    },
    getResourceTypePopupLabel: function () {
        var localeName = typeof Locale !== 'undefined' && Locale.LocaleName;

        return Ext.String.htmlDecode(
            (localeName && (localeName.ResourceTypes || localeName.ResourceType)) ||
            'Resource types');
    },
    getResourceTypeSearchLabel: function () {
        var localeName = typeof Locale !== 'undefined' && Locale.LocaleName;

        return Ext.String.htmlDecode(
            (localeName && localeName.SearchFRT) || 'Search resource types');
    },
	},
	eventFocusCls : "lk-board-event-focused",
	rowFocusCls : "lk-board-row-focused",

	enableBoardFocus : function (panel) {
		var me = this,
			schedulingView;

		if (!panel || panel.leankorBoardFocusEnabled) {
			return;
		}

		schedulingView = panel.getSchedulingView && panel.getSchedulingView();

		if (!schedulingView || !schedulingView.el) {
			panel.on(
				"afterlayout",
				function () {
					me.enableBoardFocus(panel);
				},
				me,
				{
					single : true
				}
			);
			return;
		}

		panel.leankorBoardFocusEnabled = true;

		me.bindFocusModality();
		me.setPanelAccessibility(panel);
		me.bindSchedulingView(panel, schedulingView);
		me.bindGridView(
			panel.lockedGrid &&
				panel.lockedGrid.getView &&
				panel.lockedGrid.getView()
		);
		me.bindGridView(
			panel.normalGrid &&
				panel.normalGrid.getView &&
				panel.normalGrid.getView()
		);
		me.bindHeaderAddButton(panel);
		me.syncPanel(panel);
		Ext.defer(me.syncPanel, 100, me, [panel]);
		Ext.defer(me.syncPanel, 500, me, [panel]);
	},

	bindSchedulingView : function (panel, view) {
		var me = this,
			sync = Ext.Function.createBuffered(function () {
				me.syncPanel(panel);
			}, 25);

		view.el.on(
			"focusin",
			function (e, target) {
				me.onEventFocusIn(view, e, target);
			},
			me,
			{
				delegate : view.eventSelector
			}
		);

		view.el.on(
			"focusout",
			function (e, target) {
				me.onEventFocusOut(e, target);
			},
			me,
			{
				delegate : view.eventSelector
			}
		);

		view.on({
			refresh : sync,
			itemadd : sync,
			itemupdate : sync,
			eventrepaint : function (schedulerView, eventRecord, node) {
				me.prepareEventNode(
					node,
					me.isUtilizationPanel(panel) ? -1 : 0,
					panel,
					view
				);
				if (node && me.isUtilizationPanel(panel)) {
					Ext.fly(node)
						.select(".gnt-resource-utilization-interval")
						.each(function (intervalEl) {
							me.prepareIntervalNode(intervalEl, panel, view);
						});
				}
			},
			scope : me
		});

		panel.on({
			afterlayout : sync,
			viewchange : sync,
			scope : me
		});
	},

	bindFocusModality : function () {
		var me = this,
			doc;

		if (me.focusModalityBound) {
			return;
		}

		doc = Ext.getDoc && Ext.getDoc();
		if (!doc) {
			return;
		}

		me.focusModalityBound = true;
		me.keyboardFocusActive = false;

		doc.on(
			"keydown",
			function (e) {
				if (me.isKeyboardFocusKey(e)) {
					me.setKeyboardFocusMode(true);
				}
			},
			me
		);

		doc.on(
			"mousedown",
			function () {
				me.setKeyboardFocusMode(false);
				me.clearFocusedRows();
			},
			me
		);

		doc.on(
			"touchstart",
			function () {
				me.setKeyboardFocusMode(false);
				me.clearFocusedRows();
			},
			me
		);
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

	setKeyboardFocusMode : function (keyboardFocusActive) {
		this.keyboardFocusActive = keyboardFocusActive;

		if (!Ext.getBody()) {
			return;
		}

		Ext.getBody()[keyboardFocusActive ? "addCls" : "removeCls"](
			"lk-keyboard-focus-mode"
		);
	},

	clearFocusedRows : function () {
		var body = Ext.getBody && Ext.getBody();

		if (body) {
			body.select("." + this.rowFocusCls).removeCls(this.rowFocusCls);
		}
	},

	bindGridView : function (gridView) {
		var me = this,
			rowSelector;

		if (!gridView || gridView.leankorBoardFocusEnabled) {
			return;
		}

		if (!gridView.el) {
			gridView.on(
				"afterrender",
				function () {
					me.bindGridView(gridView);
					me.syncGridView(gridView);
				},
				me,
				{
					single : true
				}
			);
			return;
		}

		gridView.leankorBoardFocusEnabled = true;
		rowSelector = me.getGridFocusSelector(gridView);

		gridView.el.on(
			"focusin",
			function (e, target) {
				me.onGridFocusIn(gridView, e, target);
			},
			me,
			{
				delegate : rowSelector + ", .x-grid-cell"
			}
		);

		gridView.el.on(
			"focusout",
			function (e, target) {
				me.onGridFocusOut(gridView, e, target);
			},
			me,
			{
				delegate : rowSelector + ", .x-grid-cell"
			}
		);

		gridView.el.on(
			"keydown",
			function (e, target) {
				me.onGridKeyDown(gridView, e, target);
			},
			me,
			{
				delegate : rowSelector + ", .x-grid-cell"
			}
		);

		gridView.on({
			refresh : function () {
				me.syncGridView(gridView);
			},
			itemadd : function () {
				me.syncGridView(gridView);
			},
			itemupdate : function () {
				me.syncGridView(gridView);
			},
			scope : me
		});
	},

	bindHeaderAddButton : function (panel) {
		var me = this;

		if (!panel.el || panel.leankorHeaderAddButtonFocusBound) {
			return;
		}

		panel.leankorHeaderAddButtonFocusBound = true;

		panel.el.on(
			"keydown",
			function (e, target) {
				me.onHeaderAddButtonKeyDown(panel, e, target);
			},
			me,
			{
				delegate : ".addBtnTop"
			}
		);

	},

	syncPanel : function (panel) {
		var view = panel && panel.getSchedulingView && panel.getSchedulingView();

		if (!panel || !view || !view.el) {
			return;
		}

		this.syncSchedulingView(panel, view);
		this.syncGridView(
			panel.lockedGrid &&
				panel.lockedGrid.getView &&
				panel.lockedGrid.getView()
		);
		this.syncGridView(
			panel.normalGrid &&
				panel.normalGrid.getView &&
				panel.normalGrid.getView()
		);
		this.syncHeaderAddButtons(panel);
	},

	syncSchedulingView : function (panel, view) {
		var me = this,
			utilizationPanel = me.isUtilizationPanel(panel);

		view.el.select(view.eventSelector).each(function (eventEl) {
			me.prepareEventNode(eventEl, utilizationPanel ? -1 : 0, panel, view);
		});

		if (utilizationPanel) {
			view.el
				.select(".gnt-resource-utilization-interval")
				.each(function (intervalEl) {
					me.prepareIntervalNode(intervalEl, panel, view);
				});
		}
	},

	syncGridView : function (gridView) {
		var me = this,
			panelLabel;

		if (!gridView || !gridView.el) {
			return;
		}

		panelLabel = me.getPanelLabel(me.getGridPanel(gridView));
		if (panelLabel) {
			gridView.el.dom.setAttribute("aria-label", panelLabel);
		}

		gridView.el
			.select(me.getGridFocusSelector(gridView))
			.each(function (rowEl) {
				me.prepareGridRow(rowEl, gridView);
			});
	},

	setPanelAccessibility : function (panel) {
		var label = this.getPanelLabel(panel);

		if (panel && panel.el && label) {
			panel.el.dom.setAttribute("aria-label", label);
		}
	},

	syncHeaderAddButtons : function (panel) {
		var label = this.getHeaderAddButtonLabel();

		if (!panel.el) {
			return;
		}

		panel.el.select(".addBtnTop").each(function (buttonEl) {
			var headerEl = buttonEl.up(".x-column-header");

			if (headerEl && headerEl.dom) {
				headerEl.dom.setAttribute("tabindex", "-1");
				headerEl.dom.setAttribute("role", "presentation");
				headerEl.removeCls("x-column-header-focus");
				headerEl
					.select(
						".x-column-header-inner, .x-column-header-text, .x-column-header-title"
					)
					.each(function (innerEl) {
						innerEl.dom.setAttribute("tabindex", "-1");
						innerEl.dom.setAttribute("role", "presentation");
					});
			}

			buttonEl.dom.setAttribute("tabindex", "0");
			buttonEl.dom.setAttribute("role", "button");
			buttonEl.dom.setAttribute("aria-label", label);
		});
	},

	prepareGridRow : function (rowEl, gridView) {
		var dom = rowEl && (rowEl.dom || rowEl),
			label;

		if (!dom) {
			return;
		}

		dom.setAttribute("tabindex", "-1");
		dom.setAttribute("role", "row");

		label = this.getGridRowLabel(rowEl, gridView);
		if (label) {
			dom.setAttribute("aria-label", label);
		}

		Ext.fly(dom)
			.select(".x-grid-cell")
			.each(function (cellEl) {
				var cellLabel = this.getGridCellLabel(cellEl, rowEl, gridView);

				cellEl.dom.setAttribute("role", "gridcell");
				cellEl.dom.setAttribute("tabindex", "-1");
				if (cellLabel) {
					cellEl.dom.setAttribute("aria-label", cellLabel);
				}
			}, this);
	},

	onGridFocusIn : function (gridView, e, target) {
		var row = this.getFocusRowFromTarget(gridView, target);

		if (!row) {
			return;
		}

		if (this.keyboardFocusActive) {
			this.clearFocusedRows(row);
			Ext.fly(row).addCls(this.rowFocusCls);
		} else {
			Ext.fly(row).removeCls(this.rowFocusCls);
		}
	},

	onGridFocusOut : function (gridView, e, target) {
		var row = this.getFocusRowFromTarget(gridView, target);

		if (row) {
			Ext.fly(row).removeCls(this.rowFocusCls);
		}
	},

	onGridKeyDown : function (gridView, e, target) {
		var key = e.getKey(),
			downKey = Ext.EventObject.DOWN || 40,
			upKey = Ext.EventObject.UP || 38,
			row,
			nextRow;

		if (key !== downKey && key !== upKey) {
			return;
		}

		row = this.getFocusRowFromTarget(gridView, target);
		nextRow = this.getAdjacentGridRow(gridView, row, key === downKey ? 1 : -1);

		if (!nextRow) {
			return;
		}

		e.stopEvent();
		this.setKeyboardFocusMode(true);
		this.focusGridRow(nextRow);
	},

	getAdjacentGridRow : function (gridView, row, direction) {
		var rows,
			index = -1,
			nextIndex;

		if (!gridView || !gridView.el || !row) {
			return null;
		}

		rows = gridView.el.select(this.getGridFocusSelector(gridView)).elements || [];
		Ext.Array.each(rows, function (candidate, candidateIndex) {
			if (candidate === row) {
				index = candidateIndex;
				return false;
			}
			return true;
		});

		nextIndex = index + direction;
		while (nextIndex >= 0 && nextIndex < rows.length) {
			if (this.isFocusableGridRow(rows[nextIndex])) {
				return rows[nextIndex];
			}
			nextIndex += direction;
		}

		return null;
	},

	isFocusableGridRow : function (row) {
		var el = row && Ext.fly(row);

		return !!(
			el &&
			row.offsetParent !== null &&
			!el.hasCls("x-grid-item-collapsed") &&
			row.getAttribute("aria-hidden") !== "true"
		);
	},

	focusGridRow : function (row) {
		if (!row) {
			return;
		}

		this.setKeyboardFocusMode(true);
		this.clearFocusedRows(row);
		Ext.fly(row).addCls(this.rowFocusCls);
		row.setAttribute("tabindex", "0");
		Ext.defer(function () {
			row.focus();
		}, 1);
	},

	getFocusRowFromTarget : function (gridView, target) {
		var rowSelector = this.getGridFocusSelector(gridView),
			targetEl = target && Ext.fly(target);

		if (!targetEl) {
			return null;
		}

		if (targetEl.is(rowSelector)) {
			return target;
		}

		return targetEl.up(rowSelector, gridView.el, true);
	},

	prepareEventNode : function (node, tabIndex, panel, view) {
		var dom = node && (node.dom || node);

		if (!dom) {
			return;
		}

		dom.setAttribute("tabindex", String(tabIndex));
		dom.setAttribute("role", tabIndex === -1 ? "presentation" : "button");
		this.setLabelFromText(dom, this.getEventLabel(dom, panel, view));
	},

	prepareIntervalNode : function (node, panel, view) {
		var dom = node && (node.dom || node),
			hidden;

		if (!dom) {
			return;
		}

		hidden = Ext.fly(dom).hasCls(
			"gnt-resource-utilization-interval-notutilized"
		);
		dom.setAttribute("tabindex", hidden ? "-1" : "0");
		dom.setAttribute("role", "gridcell");

		if (hidden) {
			dom.setAttribute("aria-hidden", "true");
		} else {
			dom.removeAttribute("aria-hidden");
		}

		this.setLabelFromText(
			dom,
			this.getUtilizationIntervalLabel(dom, panel, view)
		);
	},

	onEventFocusIn : function (view, e, target) {
		var eventNode = e.getTarget(view.eventSelector),
			selectionModel =
				view.getEventSelectionModel && view.getEventSelectionModel();

		Ext.fly(eventNode || target).addCls(this.eventFocusCls);

		if (
			eventNode &&
			view.resolveEventRecord(eventNode) &&
			selectionModel &&
			selectionModel.selectNode
		) {
			selectionModel.selectNode(eventNode, false, true);
		}
	},

	onEventFocusOut : function (e, target) {
		Ext.fly(e.getTarget(".sch-event") || target).removeCls(this.eventFocusCls);
	},

	onHeaderAddButtonKeyDown : function (panel, e, target) {
		var key = e.getKey(),
			enterKey = Ext.EventObject.ENTER || 13,
			spaceKey = Ext.EventObject.SPACE || 32;

		this.setKeyboardFocusMode(true);

		if (key === enterKey || key === spaceKey) {
			e.stopEvent();
			this.activateHeaderAddButton(panel, target, e);
		}
	},
	activateHeaderAddButton : function (panel, target, e) {
		var column = this.getHeaderAddButtonColumn(panel),
			header = panel && panel.header,
			controller =
				panel &&
				panel.lookupController &&
				panel.lookupController();

		controller =
			controller ||
			(panel &&
				panel.up &&
				panel.up("mainviewport") &&
				panel.up("mainviewport").getController &&
				panel.up("mainviewport").getController()) ||
			(Ext.ComponentQuery.query("mainviewport")[0] &&
				Ext.ComponentQuery.query("mainviewport")[0].getController &&
				Ext.ComponentQuery.query("mainviewport")[0].getController());

		if (controller && controller.onAddNewResources && column) {
			controller.onAddNewResources(header, column, {
				target : target,
				parentEvent : e
			});
			return;
		}

		if (column && column.fireEvent) {
			column.fireEvent("headerclick", header, column, {
				target : target,
				parentEvent : e
			});
			return;
		}

		target.click();
	},
	getHeaderAddButtonColumn : function (panel) {
		var lockedGrid = panel && panel.lockedGrid,
			columns =
				lockedGrid &&
				lockedGrid.headerCt &&
				lockedGrid.headerCt.getGridColumns &&
				lockedGrid.headerCt.getGridColumns(),
			column = null;

		Ext.Array.forEach(columns || [], function (candidate) {
			if (
				!column &&
				candidate &&
				candidate.el &&
				candidate.el.down &&
				candidate.el.down(".addBtnTop")
			) {
				column = candidate;
			}
		});

		return column;
	},

	focusFirstGridRow : function (panel) {
		var row = this.getFirstGridRow(panel);

		if (!row) {
			return false;
		}

		this.focusGridRow(row);
		return true;
	},

	getFirstGridRow : function (panel) {
		var lockedView =
				panel &&
				panel.lockedGrid &&
				panel.lockedGrid.getView &&
				panel.lockedGrid.getView(),
			normalView =
				panel &&
				panel.normalGrid &&
				panel.normalGrid.getView &&
				panel.normalGrid.getView(),
			row;

		row =
			this.getFirstFocusableRowFromView(lockedView) ||
			this.getFirstFocusableRowFromView(normalView);
		return row || null;
	},

	getFirstFocusableRowFromView : function (gridView) {
		var row;

		if (!gridView || !gridView.el) {
			return null;
		}

		row =
			gridView.el.down(
				this.getGridFocusSelector(gridView) + '[tabindex="0"]'
			) || gridView.el.down(this.getGridFocusSelector(gridView));

		if (row && row.dom) {
			row.dom.setAttribute("tabindex", "0");
			return row.dom;
		}

		return null;
	},

	focusLastHeaderControl : function (panel) {
		var header = panel && panel.header,
			controls,
			control;

		if (!header || !header.query) {
			return false;
		}

		controls = [];
		Ext.Array.forEach(header.query("[reference]"), function (cmp) {
			if (
				!cmp.hidden &&
				!(cmp.isDisabled && cmp.isDisabled()) &&
				cmp.el &&
				cmp.el.dom
			) {
				controls.push(cmp);
			}
		});

		control = controls.length && controls[controls.length - 1];
		if (!control) {
			return false;
		}

		Ext.defer(function () {
			if (control.focus) {
				control.focus();
			} else {
				control.el.dom.focus();
			}
		}, 1);
		return true;
	},

	setLabelFromText : function (dom, preferredLabel) {
		var label =
			preferredLabel ||
			(dom.textContent || dom.innerText || "").replace(/\s+/g, " ").trim();

		if (label) {
			dom.setAttribute("aria-label", label);
		}
	},

	getGridRowLabel : function (rowEl, gridView) {
		var dom = rowEl && (rowEl.dom || rowEl),
			record = this.getRecordFromRow(dom, gridView),
			label = this.getRecordLabel(record) || this.getElementText(dom),
			panel = this.getGridPanel(gridView),
			panelLabel = this.getPanelLabel(panel);

		if (!label) {
			return panelLabel;
		}

		return panelLabel ? panelLabel + ", " + label : label;
	},

	getGridCellLabel : function (cellEl, rowEl, gridView) {
		var column = this.getColumnForCell(cellEl, gridView),
			columnLabel = column && (column.text || column.header),
			rowLabel = this.getGridRowLabel(rowEl, gridView),
			cellLabel = this.getElementText(cellEl && (cellEl.dom || cellEl));

		columnLabel = this.stripHtml(columnLabel);

		if (columnLabel && cellLabel) {
			return columnLabel + ", " + cellLabel;
		}

		return cellLabel || rowLabel;
	},

	getEventLabel : function (dom, panel, view) {
		var record =
				view && view.resolveEventRecord && view.resolveEventRecord(dom),
			resource = record && record.getResource && record.getResource(),
			label = this.getRecordLabel(record),
			resourceLabel = this.getRecordLabel(resource),
			panelLabel = this.getPanelLabel(panel);

		if (resourceLabel && label) {
			label = resourceLabel + ", " + label;
		}

		return panelLabel && label ? panelLabel + ", " + label : label;
	},

	getUtilizationIntervalLabel : function (dom, panel, view) {
		var summaryEvent =
				view && view.resolveEventRecord && view.resolveEventRecord(dom),
			resource =
				summaryEvent &&
				summaryEvent.getOriginalResource &&
				summaryEvent.getOriginalResource(),
			resourceLabel = this.getRecordLabel(resource),
			rowLabel = this.getIntervalRowLabel(dom, view),
			status = this.getUtilizationStatus(dom),
			value = this.getElementText(dom),
			panelLabel = this.getPanelLabel(panel),
			parts = [];

		if (panelLabel) {
			parts.push(panelLabel);
		}

		parts.push(resourceLabel || rowLabel || this.getElementText(dom));

		if (status) {
			parts.push(status);
		}

		if (value) {
			parts.push(value);
		}

		return Ext.Array.clean(parts).join(", ");
	},

	getIntervalRowLabel : function (dom, view) {
		var row = Ext.fly(dom).up(".x-grid-item");

		return (
			(row && this.getRecordLabel(this.getRecordFromRow(row.dom, view))) ||
			(row && this.getElementText(row.dom))
		);
	},

	getRecordFromRow : function (rowDom, gridView) {
		if (!rowDom || !gridView || !gridView.getRecord) {
			return null;
		}

		return gridView.getRecord(rowDom);
	},

	getGridFocusSelector : function (gridView) {
		return (
			(gridView && (gridView.rowSelector || gridView.itemSelector)) ||
			".x-grid-item"
		);
	},

	getRecordLabel : function (record) {
		var assignment, task, value;

		if (!record) {
			return "";
		}

		if (record.getOriginalAssignment) {
			assignment = record.getOriginalAssignment();
			if (assignment && assignment.get) {
				value = assignment.get("CustomTaskName");
			}
		}

		if (!value && record.getOriginalTask) {
			task = record.getOriginalTask();
			value =
				task &&
				((task.getName && task.getName()) || (task.get && task.get("Name")));
		}

		if (!value && record.getTaskName) {
			value = record.getTaskName();
		}

		if (!value && record.getName) {
			value = record.getName();
		}

		if (!value && record.get) {
			value =
				record.get("Name") || record.get("name") || record.get("TaskName");
		}

		return this.stripHtml(value);
	},

	getPanelLabel : function (panel) {
		var localeName = typeof Locale !== "undefined" && Locale.LocaleName;

		if (panel && panel.isXType && panel.isXType("assignmentgridpanel")) {
			return this.stripHtml(
				(localeName && localeName.ResourceUtilization) || "Assignment grid"
			);
		}

		if (panel && panel.isXType && panel.isXType("resourceschedule")) {
			return this.stripHtml(
				(localeName && localeName.ResourceSchedule) || "Resource schedule"
			);
		}

		return this.stripHtml(panel && (panel.title || panel.itemId));
	},

	getGridPanel : function (gridView) {
		var ownerGrid = gridView && gridView.ownerGrid;

		return (
			(ownerGrid &&
				ownerGrid.up &&
				(ownerGrid.up("assignmentgridpanel") ||
					ownerGrid.up("resourceschedule"))) ||
			ownerGrid
		);
	},

	getColumnForCell : function (cellEl, gridView) {
		var dom = cellEl && (cellEl.dom || cellEl),
			headerCt = gridView && gridView.getHeaderCt && gridView.getHeaderCt(),
			cellIndex;

		if (!dom || !headerCt) {
			return null;
		}

		cellIndex = dom.getAttribute("data-columnid");

		return (
			(cellIndex &&
				(Ext.getCmp(cellIndex) || headerCt.down("#" + cellIndex))) ||
			null
		);
	},

	getUtilizationStatus : function (dom) {
		var el = Ext.fly(dom),
			localeName = typeof Locale !== "undefined" && Locale.LocaleName;

		if (el.hasCls("gnt-resource-utilization-interval-overallocated")) {
			return this.stripHtml(
				(localeName && localeName.Overallocated) || "overallocated"
			);
		}

		if (el.hasCls("gnt-resource-utilization-interval-underallocated")) {
			return this.stripHtml(
				(localeName && localeName.Underallocated) || "underallocated"
			);
		}

		if (el.hasCls("gnt-resource-utilization-interval-optimallyallocated")) {
			return "optimally allocated";
		}

		if (el.hasCls("gnt-resource-utilization-interval-notcalculated")) {
			return "not calculated";
		}

		return "";
	},

	getElementText : function (dom) {
		return ((dom && (dom.textContent || dom.innerText)) || "")
			.replace(/\s+/g, " ")
			.trim();
	},

	stripHtml : function (value) {
		if (value === null || value === undefined) {
			return "";
		}

		return Ext.String.htmlDecode(String(value).replace(/<[^>]*>/g, ""))
			.replace(/\s+/g, " ")
			.trim();
	},

	getHeaderAddButtonLabel : function () {
		var localeName = typeof Locale !== "undefined" && Locale.LocaleName,
			add = localeName && localeName.Add,
			resourceTypes = localeName && localeName.ResourceTypes;

		return Ext.String.trim(
			(add || "Add") + " " + (resourceTypes || "resource types")
		);
	},

	isUtilizationPanel : function (panel) {
		return panel.isXType && panel.isXType("assignmentgridpanel");
	}
});
