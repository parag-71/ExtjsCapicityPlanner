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
		this.createLiveRegion();
		this.createLiveRegion(true);
		this.patchNavigationModelEnter();
		this.installGlobalEscapeHandler();
		this.installGridHeaderFocusGuard();
	},

	patchNavigationModelEnter : function () {
		Ext.Array.forEach(
			[
				"Ext.view.NavigationModel",
				"Ext.grid.NavigationModel",
				"Ext.tree.NavigationModel",
				"Ext.view.BoundListKeyNav",
				"Ext.dataview.NavigationModel"
			],
			function (name) {
				var NM = Ext.ClassManager.get(name);

				if (!NM || !NM.prototype || !NM.prototype.onKeyEnter) {
					return;
				}
				if (NM.prototype.leankorOnKeyEnterPatched) {
					return;
				}

				NM.prototype.leankorOnKeyEnterPatched = true;
				Ext.override(NM, {
					onKeyEnter : function (keyEvent) {
						var position = keyEvent && keyEvent.position,
							view = (position && position.view) || this.view;

						if (!view || view.destroyed) {
							return;
						}

						try {
							return this.callParent(arguments);
						} catch (ignore) {
							return;
						}
					}
				});
			}
		);
	},

	installGridHeaderFocusGuard : function () {
		var me = this;

		if (this.leankorGridHeaderFocusGuardInstalled) {
			return;
		}

		this.leankorGridHeaderFocusGuardInstalled = true;

		if (Ext.grid && Ext.grid.column && Ext.grid.column.Column) {
			Ext.override(Ext.grid.column.Column, {
				tabIndex : -1,

				afterRender : function () {
					this.callParent(arguments);
					me.disableGridHeaderTabStop(this);
				},

				afterComponentLayout : function () {
					this.callParent(arguments);
					me.disableGridHeaderTabStop(this);
				}
			});
		}

		if (Ext.grid && Ext.grid.header && Ext.grid.header.Container) {
			Ext.override(Ext.grid.header.Container, {
				initComponent : function () {
					this.callParent(arguments);

					if (this.isRootHeader) {
						this.focusableContainer = false;
						this.activateFocusableContainer = false;
					}
				},

				afterRender : function () {
					this.callParent(arguments);
					me.disableGridHeaderContainerTabStops(this);
				},

				afterComponentLayout : function () {
					this.callParent(arguments);
					me.disableGridHeaderContainerTabStops(this);
				}
			});
		}
	},

	disableGridHeaderContainerTabStops : function (headerCt) {
		var me = this,
			columns;

		if (!headerCt || !headerCt.rendered || !headerCt.getGridColumns) {
			return;
		}

		columns = headerCt.getGridColumns();
		Ext.Array.forEach(columns, function (column) {
			me.disableGridHeaderTabStop(column);
		});
	},

	disableGridHeaderTabStop : function (column) {
		var el = column && column.el;

		if (!el || !el.dom) {
			return;
		}

		el.dom.setAttribute("tabindex", "-1");
		el.removeCls("x-column-header-focus");
		el
			.select(
				".x-column-header-inner, .x-column-header-text, .x-column-header-text-container, .x-column-header-text-wrapper, .x-column-header-title"
			)
			.each(function (innerEl) {
				innerEl.dom.setAttribute("tabindex", "-1");
			});
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

	createLiveRegion : function (assertive) {
		var id = assertive ? "cp-a11y-live-region-assertive" : "cp-a11y-live-region",
			el = document.getElementById(id);

		if (el) {
			return el;
		}

		el = document.createElement("div");
		el.id = id;
		el.setAttribute("role", assertive ? "alert" : "status");
		el.setAttribute("aria-live", assertive ? "assertive" : "polite");
		el.setAttribute("aria-atomic", "true");
		el.className = "sr-only";
		document.body.appendChild(el);

		return el;
	},

	announce : function (text) {
		var me = this,
			el;

		if (!text) {
			return;
		}

		el = me.createLiveRegion();
		clearTimeout(me.announceTimer);
		clearTimeout(me.announceClearTimer);
		el.textContent = "";
		me.announceTimer = setTimeout(function () {
			el.textContent = text;
			me.announceClearTimer = setTimeout(function () {
				el.textContent = "";
			}, 4000);
		}, 80);
	},

	setBusy : function (target, busy) {
		var dom,
			localeName = typeof Locale !== "undefined" && Locale.LocaleName;

		if (!target) {
			return;
		}

		if (target.nodeType === 1) {
			dom = target;
		} else if (target.el && target.el.dom) {
			dom = target.el.dom;
		} else if (target.getEl && target.getEl()) {
			dom = target.getEl().dom;
		}

		if (!dom) {
			return;
		}

		if (busy) {
			dom.setAttribute("aria-busy", "true");
			this.announce((localeName && localeName.PleaseWait) || "Loading");
		} else {
			dom.removeAttribute("aria-busy");
			this.announce((localeName && localeName.LoadingComplete) ||
				"Loading complete");
		}
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

			if (!combo.el || !combo.el.dom || combo.el.dom.leankorComboEnterBound) {
					return;
				}

			combo.el.dom.leankorComboEnterBound = true;
			combo.el.dom.addEventListener("keydown", function (e) {
				var pickerVisible,
					stopAndReset,
					navigationModel,
					selectionModel,
					before,
					extEvent;

				if (
					e.keyCode === 32 &&
					combo.picker &&
					Ext.isFunction(combo.picker.isVisible) &&
					combo.picker.isVisible()) {
					navigationModel =
						combo.picker.getNavigationModel &&
						combo.picker.getNavigationModel();
					if (navigationModel && Ext.isFunction(navigationModel.selectHighlighted)) {
						e.preventDefault();
						e.stopPropagation();
						if (e.stopImmediatePropagation) {
							e.stopImmediatePropagation();
						}
						extEvent = {
							getKey: function () {
								return 13;
							},
							stopEvent: Ext.emptyFn,
							ENTER: 13,
							keyCode: 13,
							target: e.target,
							type: e.type,
							ctrlKey: e.ctrlKey,
							shiftKey: e.shiftKey,
							altKey: e.altKey,
							metaKey: e.metaKey,
							button: 0,
							browserEvent: e
						};
						selectionModel =
							combo.picker.getSelectionModel &&
							combo.picker.getSelectionModel();
						before = selectionModel ? selectionModel.getCount() : 0;
						navigationModel.selectHighlighted(extEvent);
						if (
							!combo.multiSelect &&
							selectionModel &&
							before === selectionModel.getCount() &&
							Ext.isFunction(combo.collapse)) {
							combo.collapse();
						}
					}
					return;
				}

				if (e.keyCode !== 13) {
					return;
				}

				stopAndReset = function () {
					e.preventDefault();
					e.stopPropagation();
					if (e.stopImmediatePropagation) {
						e.stopImmediatePropagation();
					}
					combo.isExpanded = false;
				};

				if (!combo.displayField) {
					stopAndReset();
					combo.fireEvent("expand", combo);
					return;
				}

				pickerVisible =
					combo.picker &&
					Ext.isFunction(combo.picker.isVisible) &&
					combo.picker.isVisible();
				if (pickerVisible) {
					return;
				}

				stopAndReset();
				if (Ext.isFunction(combo.expand)) {
					combo.expand();
				}
			}, true);
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
				enterKey = Ext.event.Event.ENTER || 13,
				spaceKey = Ext.event.Event.SPACE || 32;

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
			var escKey = Ext.event.Event.ESC || 27,
				key = e.getKey && e.getKey();

			if (key !== escKey) {
				return true;
			}

			e.stopEvent();
			me.closeComponent(cmp, e, target);
			return false;
		});
	},

	setAriaModal : function (panel) {
		if (!panel) {
			return;
		}

		var apply = function () {
			var ariaDom = (panel.ariaEl && panel.ariaEl.dom) || (panel.el && panel.el.dom),
				titleCmp = panel.header && panel.header.titleCmp,
				titleEl = titleCmp && titleCmp.el && titleCmp.el.dom;

			if (!ariaDom) {
				return;
			}

			ariaDom.setAttribute("role", "dialog");
			ariaDom.setAttribute("aria-modal", "true");
			if (titleEl) {
				if (!titleEl.id) {
					titleEl.id = "a11y-title-" + Ext.id();
				}
				ariaDom.setAttribute("aria-labelledby", titleEl.id);
			}
		};

		if (panel.rendered) {
			apply();
		} else {
			panel.on("afterrender", apply, null, { single : true });
		}
	},

	restoreFocus : function () {
		var el = this._capturedFocus;

		this._capturedFocus = null;
		if (el && Ext.isFunction(el.focus) && document.body.contains(el)) {
			el.focus();
		}
	},

	constrainToViewport : function (cmp) {
		if (!cmp || !cmp.el || !cmp.el.dom) {
			return;
		}

		var x = cmp.getX ? cmp.getX() : cmp.el.getX(),
			y = cmp.getY ? cmp.getY() : cmp.el.getY(),
			w = cmp.el.getWidth(),
			h = cmp.el.getHeight(),
			vw = window.innerWidth,
			vh = window.innerHeight,
			sx = window.pageXOffset || 0,
			sy = window.pageYOffset || 0,
			nextX = x,
			nextY = y;

		if (nextX + w > sx + vw) {
			nextX = sx + vw - w - 10;
		}
		if (nextX < sx + 10) {
			nextX = sx + 10;
		}
		if (nextY + h > sy + vh) {
			nextY = sy + vh - h - 10;
		}
		if (nextY < sy + 10) {
			nextY = sy + 10;
		}

		if (cmp.setPosition) {
			cmp.setPosition(nextX, nextY);
		} else {
			cmp.el.setXY([nextX, nextY]);
		}
	},

	decoratePopup : function (popup) {
		if (!popup || popup._wcagDecorated) {
			return;
		}

		popup._wcagDecorated = true;
		var me = this,
			apply = function () {
				var maxH = Math.floor(window.innerHeight * 0.9);

				if (popup.getHeight && popup.getHeight() > maxH) {
					popup.setMaxHeight(maxH);
				}
				me.constrainToViewport(popup);
			},
			resizeHandler = function () {
				if (popup.isVisible && popup.isVisible()) {
					apply();
				}
			};

		popup.on("show", apply);
		window.addEventListener("resize", resizeHandler);
		popup.on("destroy", function () {
			window.removeEventListener("resize", resizeHandler);
		});
	},

	bootReflowOverrides : function () {
		var util = this,
			isInIframe = window !== window.parent,
			outerHint = !isInIframe && window.outerWidth > 0 ? window.outerWidth - 16 : 0,
			minViewportWidth = Math.max(window.innerWidth, outerHint, 1024),
			updateZoomOverflow;

		LeankorApp.wcagConstrainToViewport = function (win) {
			util.constrainToViewport(win);
		};

		if (!Ext.Element._wcagViewportWidthApplied) {
			Ext.Element._wcagViewportWidthApplied = true;
			Ext.Element._wcagOrigGetViewportWidth = Ext.Element.getViewportWidth;
			Ext.Element.getViewportWidth = function () {
				return Math.max(
					Ext.Element._wcagOrigGetViewportWidth.call(this),
					minViewportWidth
				);
			};
		}

		document.documentElement.style.setProperty(
			"--min-viewport-width",
			minViewportWidth + "px"
		);

		updateZoomOverflow = function () {
			var cl = document.documentElement.classList;

			if (window.innerWidth < minViewportWidth) {
				cl.add("x-zoom-overflow");
			} else {
				cl.remove("x-zoom-overflow");
			}
		};
		window.addEventListener("resize", updateZoomOverflow);
		updateZoomOverflow();

		if (!Ext.window.Window._wcagVerticalApplied) {
			Ext.window.Window._wcagVerticalApplied = true;
			Ext.override(Ext.window.Window, {
				afterRender : function () {
					this.callParent(arguments);

					if (
						this.el &&
						(this.el.hasCls("taskEditorPluginCls") ||
							this.el.hasCls("taskEditorCls"))
					) {
						return;
					}

					var win = this,
						fit = function () {
							if (!document.documentElement.classList.contains("x-zoom-overflow")) {
								return;
							}

							var vh = window.innerHeight,
								vw = window.innerWidth;

							if (win.getHeight() > vh) {
								win.setMaxHeight(vh);
							}
							if (win.getWidth() > vw) {
								win.setMaxWidth(vw);
							}
							util.constrainToViewport(win);
						},
						resizeHandler = function () {
							fit();
						};

					fit();
					win.on("show", fit);
					window.addEventListener("resize", resizeHandler);
					win.on("destroy", function () {
						window.removeEventListener("resize", resizeHandler);
					});
				}
			});

			Ext.override(Ext.menu.Menu, {
				onShow : function () {
					this.callParent(arguments);
					if (!document.documentElement.classList.contains("x-zoom-overflow")) {
						return;
					}

					var vh = window.innerHeight,
						maxH = Math.floor(vh * 0.9),
						pos;

					if (this.getHeight() > maxH) {
						this.setMaxHeight(maxH);
					}
					pos = this.getPosition();
					if (pos[1] + this.getHeight() > vh) {
						this.setPosition(pos[0], Math.max(0, vh - this.getHeight()));
					}
				}
			});
		}

		if (!Ext.AbstractComponent._wcagSetLoadingApplied) {
			Ext.AbstractComponent._wcagSetLoadingApplied = true;
			Ext.override(Ext.AbstractComponent, {
				setLoading : function (load) {
					var ret = this.callParent(arguments);

					util.setBusy(this, load !== false && load != null);
					return ret;
				}
			});
		}
	},

	insertSkipLink : function (mainPanel) {
		var me = this,
			localeName = typeof Locale !== "undefined" && Locale.LocaleName,
			panelLabel = this.getPanelLabel && this.getPanelLabel(mainPanel),
			link;

		if (document.querySelector(".skip-link[data-cp-skip]")) {
			return;
		}

		link = document.createElement("a");
		link.href = "#";
		link.className = "skip-link";
		link.textContent =
			(localeName && localeName.SkipToMain) || "Skip to main content";
		link.setAttribute("data-cp-skip", "true");
		link.addEventListener("click", function (e) {
			var dom;

			e.preventDefault();
			if (!mainPanel) {
				return;
			}

			// Land focus directly on the first row of the upper grid section
			// (mirrors resource-management's skip link, which jumps to the first
			// grid row). In the empty-board state there is no row, so land on the
			// region and route the next forward Tab to the grid add button.
			me.setKeyboardFocusMode(true);
			if (me.focusFirstGridRow(mainPanel)) {
				return;
			}

			if (me.getHeaderAddButton(mainPanel)) {
				if (mainPanel.body && mainPanel.body.dom) {
					dom = mainPanel.body.dom;
					if (!dom.hasAttribute("tabindex")) {
						dom.setAttribute("tabindex", "-1");
					}
					dom.setAttribute("role", "region");
					if (panelLabel) {
						dom.setAttribute("aria-label", panelLabel);
					}
					dom.focus();
				}
				me.armEmptyBoardSkipHandoff(mainPanel, dom || document.body);
				return;
			}

			if (me.focusFirstTimelineItem(mainPanel)) {
				return;
			}

			if (!mainPanel.body || !mainPanel.body.dom) {
				return;
			}
			dom = mainPanel.body.dom;
			if (!dom.hasAttribute("tabindex")) {
				dom.setAttribute("tabindex", "-1");
			}
			dom.setAttribute("role", "region");
			if (panelLabel) {
				dom.setAttribute("aria-label", panelLabel);
			}
			dom.focus();
			me.armEmptyBoardSkipHandoff(mainPanel, dom);
		});
		document.body.insertBefore(link, document.body.firstChild);
	},

	armEmptyBoardSkipHandoff : function (panel, focusDom) {
		var me = this,
			dom = focusDom && (focusDom.dom || focusDom),
			tabKey = Ext.event.Event.TAB || 9,
			cleanup,
			onKeyDown,
			onFocusOut;

		if (!panel || !dom || !dom.addEventListener) {
			return;
		}

		if (dom.leankorEmptySkipHandoffCleanup) {
			dom.leankorEmptySkipHandoffCleanup();
		}

		cleanup = function () {
			dom.removeEventListener("keydown", onKeyDown, true);
			dom.removeEventListener("focusout", onFocusOut, true);
			delete dom.leankorEmptySkipHandoffCleanup;
		};
		onKeyDown = function (event) {
			var key = event.keyCode || event.which;

			if (key !== tabKey) {
				return;
			}

			cleanup();
			if (event.shiftKey) {
				return;
			}

			if (me.focusFirstGridRow(panel) ||
				me.focusFirstTimelineItem(panel) ||
				me.focusHeaderAddButton(panel)) {
				event.preventDefault();
				event.stopPropagation();
			}
		};
		onFocusOut = function () {
			Ext.defer(function () {
				var active = document.activeElement;

				if (active !== dom && !(dom.contains && dom.contains(active))) {
					cleanup();
				}
			}, 1);
		};

		dom.leankorEmptySkipHandoffCleanup = cleanup;
		dom.addEventListener("keydown", onKeyDown, true);
		dom.addEventListener("focusout", onFocusOut, true);
	},

	initPopupKeyboardNav : function (popup, opener, opts) {
		if (!popup || popup._popupKbInited) {
			return;
		}

		opts = opts || {};
		popup._popupKbInited = true;
		var me = this;
		popup._a11yOpener = opener || document.activeElement;

		var collectFocusables = function () {
			var list = [],
				filterField,
				view,
				viewDom,
				closeTool;

			if (!popup.el || !popup.el.dom) {
				return list;
			}

			filterField = popup.down("textfield");
			if (filterField && filterField.inputEl && filterField.isVisible(true)) {
				list.push(filterField.inputEl.dom);
			}

			view = Ext.isFunction(popup.getView) ? popup.getView() : null;
			if (view && view.el && view.el.dom) {
				viewDom = view.el.dom;
				if (!viewDom.hasAttribute("tabindex")) {
					viewDom.setAttribute("tabindex", "0");
				}
				list.push(viewDom);
			}

			Ext.Array.forEach(popup.query("toolbar button"), function (btn) {
				if (btn.el && btn.el.dom && !btn.disabled && btn.isVisible(true)) {
					list.push(btn.el.dom);
				}
			});

			closeTool = popup.down("tool[type=close]");
			if (closeTool && closeTool.el && closeTool.el.dom) {
				list.push(closeTool.el.dom);
			}

			return list;
		};

		var focusFirstRow = function () {
			var view = Ext.isFunction(popup.getView) ? popup.getView() : null,
				store = view && view.getStore && view.getStore(),
				firstRec = store && store.getCount && store.getCount() ? store.getAt(0) : null,
				node = firstRec && view.getNode && view.getNode(firstRec),
				sm = popup.getSelectionModel && popup.getSelectionModel();

			if (!node) {
				return false;
			}

			if (!node.hasAttribute("tabindex")) {
				node.setAttribute("tabindex", "0");
			}
			// Focus the first row as the keyboard entry point, but do NOT select
			// it — selection is explicit (Space/Enter) so the multiselect popup
			// does not open with an unintended row already in the filter.
			node.focus();
			return true;
		};

		var onShow = function () {
			me.setAriaModal(popup);
			me.initCloseToolAccessibility(popup, false);
			Ext.defer(function () {
				var focusables = collectFocusables(),
					view = Ext.isFunction(popup.getView) ? popup.getView() : null,
					store,
					listener;

				if (!focusables.length || !focusables[0]) {
					return;
				}

				focusables[0].focus();
				if (!view || !view.el || view.el.dom !== focusables[0]) {
					return;
				}

				store = view.getStore && view.getStore();
				if (!store || focusFirstRow()) {
					return;
				}

				listener = function () {
					if (focusFirstRow()) {
						store.un("refresh", listener);
						store.un("datachanged", listener);
						store.un("load", listener);
					}
				};
				store.on("refresh", listener);
				store.on("datachanged", listener);
				store.on("load", listener);
				popup.on("close", function () {
					store.un("refresh", listener);
					store.un("datachanged", listener);
					store.un("load", listener);
				}, null, { single : true });
			}, 150);
		};

		var restoreOpenerFocus = function () {
			var openerTarget = popup._a11yOpener;

			if (
				openerTarget &&
				openerTarget.isComponent &&
				!openerTarget.destroyed &&
				(openerTarget.xtype === "combobox" || openerTarget.xtype === "combo")) {
				openerTarget.isExpanded = false;
				if (
					openerTarget.picker &&
					Ext.isFunction(openerTarget.picker.hide) &&
					Ext.isFunction(openerTarget.picker.isVisible) &&
					openerTarget.picker.isVisible()) {
					openerTarget.picker.hide();
				}
			}

			Ext.defer(function () {
				try {
					if (!openerTarget) {
						return;
					}
					if (openerTarget.isComponent && openerTarget.leankorHeaderViewCombo) {
						openerTarget.leankorEnterSelecting = true;
						Ext.defer(function () {
							if (!openerTarget.destroyed) {
								openerTarget.leankorEnterSelecting = false;
							}
						}, 250);
					}
					if (openerTarget.isComponent) {
						if (!openerTarget.destroyed && Ext.isFunction(openerTarget.focus)) {
							openerTarget.focus();
						}
					} else if (Ext.isFunction(openerTarget.focus) && document.body.contains(openerTarget)) {
						openerTarget.focus();
					}
				} catch (ignore) {}
			}, 50);
		};

		var wireTabTrap = function () {
			if (!popup.el || !popup.el.dom || popup.el.dom._popupTabTrapBound) {
				return;
			}

			var focusActiveViewRow = function (view) {
				var selectionModel = popup.getSelectionModel && popup.getSelectionModel(),
					selection = selectionModel && selectionModel.getSelection && selectionModel.getSelection(),
					record = selection && selection[0],
					node,
					store;

				if (!view || !view.el || !view.el.dom) {
					return false;
				}

				if (!record) {
					node = view.el.down(".lk-popup-row-focused", true) ||
						view.el.down(".x-grid-item[tabindex='0']", true);
					record = node && view.getRecord && view.getRecord(node);
				}

				if (!record) {
					store = view.getStore && view.getStore();
					record = store && store.getCount && store.getCount() ? store.getAt(0) : null;
				}

				node = record && view.getNode && view.getNode(record);
				if (!node) {
					return false;
				}

				if (selectionModel && record) {
					selectionModel.select(record);
				}
				view.el.select(".lk-popup-row-focused").removeCls("lk-popup-row-focused");
				Ext.fly(node).addCls("lk-popup-row-focused");
				node.setAttribute("tabindex", "0");
				node.focus();
				return true;
			};

			popup.el.dom._popupTabTrapBound = true;
			popup.el.dom.addEventListener("keydown", function (e) {
				var focusables,
					active,
					idx,
					next,
					i,
					view,
					activeRow,
					nextRow,
					nextRecord,
					selectionModel;

				if (e.keyCode !== 9) {
					return;
				}

				if (Ext.getBody()) {
					Ext.getBody().addCls("lk-keyboard-focus-mode");
				}

				if (opts.tabNavigatesRows) {
					view = Ext.isFunction(popup.getView) ? popup.getView() : null;
					if (view && view.el && view.el.dom) {
						active = document.activeElement;
						activeRow = active && active.closest && active.closest(".x-grid-item");
						if (activeRow && view.el.dom.contains(activeRow)) {
							nextRow = e.shiftKey ?
								activeRow.previousElementSibling :
								activeRow.nextElementSibling;
							if (nextRow) {
								nextRecord = view.getRecord && view.getRecord(nextRow);
								selectionModel = popup.getSelectionModel && popup.getSelectionModel();
								e.preventDefault();
								e.stopPropagation();
								if (selectionModel && nextRecord) {
									selectionModel.select(nextRecord);
								}
								view.el.select(".lk-popup-row-focused").removeCls("lk-popup-row-focused");
								Ext.fly(nextRow).addCls("lk-popup-row-focused");
								if (!nextRow.hasAttribute("tabindex")) {
									nextRow.setAttribute("tabindex", "0");
								}
								nextRow.focus();
								return;
							}
						}
					}
				}

				focusables = collectFocusables();
				if (!focusables.length) {
					return;
				}

				active = document.activeElement;
				idx = focusables.indexOf(active);
				if (idx === -1) {
					for (i = 0; i < focusables.length; i++) {
						if (focusables[i].contains && focusables[i].contains(active)) {
							idx = i;
							break;
						}
					}
				}
				if (idx === -1) {
					return;
				}

				next = e.shiftKey ? idx - 1 : idx + 1;
				if (next < 0) {
					next = focusables.length - 1;
				}
				if (next >= focusables.length) {
					next = 0;
				}
				e.preventDefault();
				e.stopPropagation();
				focusables[next].focus();
				view = Ext.isFunction(popup.getView) ? popup.getView() : null;
				if (view && view.el && focusables[next] === view.el.dom) {
					Ext.defer(function () {
						focusActiveViewRow(view);
					}, 1);
				}
			}, true);
		};

		var wirePopupAnnouncements = function () {
			var liveRegion = document.getElementById("rm-a11y-popup-region"),
				view,
				viewDomRef,
				sm,
				lastSelectionKey = null,
				announceTimer = null,
				clearTimer = null;

			if (popup._popupAnnouncementsBound) {
				return;
			}
			popup._popupAnnouncementsBound = true;

			if (!liveRegion) {
				liveRegion = document.createElement("div");
				liveRegion.id = "rm-a11y-popup-region";
				liveRegion.setAttribute("role", "status");
				liveRegion.setAttribute("aria-live", "polite");
				liveRegion.setAttribute("aria-atomic", "true");
				liveRegion.style.cssText =
					"position:absolute;width:1px;height:1px;overflow:hidden;left:-10000px;clip:rect(0 0 0 0);";
				document.body.appendChild(liveRegion);
			}

			var getRecord = function () {
				var selectionModel,
					selection,
					rec,
					popupView,
					store;

				// Deferred selectionchange/announce callbacks can run after the popup has
				// closed (close -> store.removeAll -> selectionchange). Once the popup is
				// destroyed its selection model is torn down and getSelection() throws on a
				// null internal collection, so bail out before touching it.
				if (popup.destroyed) {
					return null;
				}

				selectionModel = popup.getSelectionModel && popup.getSelectionModel();
				selection = selectionModel && selectionModel.getSelection && selectionModel.getSelection();
				rec = selection && selection[0];

				if (rec) {
					return rec;
				}

				popupView = popup.getView && popup.getView();
				store = popupView && popupView.getStore && popupView.getStore();
				return store && store.getCount && store.getCount() ? store.getAt(0) : null;
			};

			var speak = function (rec) {
				var popupView = popup.getView && popup.getView(),
					store = popupView && popupView.getStore && popupView.getStore(),
					name,
					index;

				if (!rec || !rec.get || !store || popup.destroyed) {
					return false;
				}

				name = rec.get("Name") || rec.get("name") || rec.get("text") || "";
				if (!name) {
					return false;
				}

				index = store.indexOf(rec);
				if (announceTimer) {
					window.clearTimeout(announceTimer);
				}
				if (clearTimer) {
					window.clearTimeout(clearTimer);
				}
				liveRegion.textContent = "";
				announceTimer = window.setTimeout(function () {
					if (popup.destroyed) {
						return;
					}
					liveRegion.textContent =
						me.cleanAriaText(name) + ", " + (index + 1) + " of " + store.getCount();
					clearTimer = window.setTimeout(function () {
						if (!popup.destroyed) {
							liveRegion.textContent = "";
						}
					}, 4000);
				}, 120);
				return true;
			};

			var announceCurrent = function (delay) {
				Ext.defer(function () {
					speak(getRecord());
				}, delay || 120);
			};

			popup.on("show", function () {
				announceCurrent(600);
			});
			popup.on("destroy", function () {
				if (announceTimer) {
					window.clearTimeout(announceTimer);
				}
				if (clearTimer) {
					window.clearTimeout(clearTimer);
				}
			});
			if (popup.isVisible && popup.isVisible()) {
				announceCurrent(600);
			}

			view = popup.getView && popup.getView();
			viewDomRef = view && view.el && view.el.dom;
			if (viewDomRef) {
				viewDomRef.addEventListener("focus", function () {
					announceCurrent(120);
				});
			}

			sm = popup.getSelectionModel && popup.getSelectionModel();
			if (sm && sm.on) {
				sm.on("selectionchange", function () {
					Ext.defer(function () {
						var rec = getRecord(),
							key = rec && (rec.id || (rec.get && (rec.get("Id") || rec.get("name") || rec.get("Name"))));

						if (!rec || key === lastSelectionKey) {
							return;
						}
						lastSelectionKey = key;
						speak(rec);
					}, 100);
				});
			}
		};

		popup.on("show", onShow);
		popup.on("hide", restoreOpenerFocus);
		popup.on("close", restoreOpenerFocus);
		if (popup.isVisible && popup.isVisible()) {
			onShow();
		}

		if (popup.rendered) {
			wireTabTrap();
			wirePopupAnnouncements();
		} else {
			popup.on("afterrender", wireTabTrap, null, { single : true });
			popup.on("afterrender", wirePopupAnnouncements, null, { single : true });
		}

		this.bindEscapeToClose(popup);
	},

	wireTreeKeyboardNav : function (treePanel, opts) {
		if (!treePanel || treePanel._treeKbInited) {
			return;
		}

		treePanel._treeKbInited = true;
		opts = opts || {};

		var expand = function (rec) {
				if (Ext.isFunction(opts.beforeExpand)) {
					opts.beforeExpand(rec, function () {
						rec.expand();
					});
				} else {
					rec.expand();
				}
			},
			ready = function () {
				var view = treePanel.getView && treePanel.getView();

				if (!view || !view.el || !view.el.dom) {
					return;
				}

				var focusRowEl = function (rowEl) {
						if (!rowEl) {
							return;
						}

						view.el.select(".lk-popup-row-focused").removeCls("lk-popup-row-focused");
						Ext.fly(rowEl).addCls("lk-popup-row-focused");
						if (!rowEl.hasAttribute("tabindex")) {
							rowEl.setAttribute("tabindex", "0");
						}
					},
					focusRowForRecord = function (record) {
						var node = record && view.getNode && view.getNode(record);

						if (!node) {
							return false;
						}

						focusRowEl(node);
						return true;
					},
					syncFocusedRow = function () {
						var sm = treePanel.getSelectionModel && treePanel.getSelectionModel(),
							active = document.activeElement,
							marked,
							record;

						// Selection fully cleared (e.g. the Reset button) — drop the
						// multi-select tracking so stale pins don't keep rows "stuck".
						if (sm && sm.getSelection && sm.getSelection().length === 0) {
							treePanel.leankorPinned = {};
							treePanel.leankorNavRec = null;
						}

						// Keep focus on the row the user is on. Snapping to the first
						// selected record (as a single-select list would) fights
						// multi-select: every Space toggle fires selectionchange and
						// would yank focus back to the top of the tree.
						while (active && active !== view.el.dom) {
							if (Ext.fly(active).hasCls("x-grid-item")) {
								focusRowEl(active);
								return;
							}
							active = active.parentNode;
						}

						marked = view.el.down && view.el.down(".lk-popup-row-focused", true);
						if (marked) {
							focusRowEl(marked);
							return;
						}

						// Fall back to the selection only when nothing is focused
						// (e.g. restoring focus after a folder expand re-renders rows).
						record = sm && sm.getSelection && sm.getSelection()[0];
						if (record) {
							focusRowForRecord(record);
						}
					},
					resolveRec = function () {
						var sm = treePanel.getSelectionModel && treePanel.getSelectionModel(),
							rec,
							el;

						// Prefer the row that currently has DOM focus. With multi-select
						// the selection can hold several rows, so its first entry is not
						// necessarily the row the user is navigating to act on.
						el = document.activeElement;
						while (el && el !== view.el.dom) {
							rec = view.getRecord && view.getRecord(el);
							if (rec) {
								return rec;
							}
							el = el.parentNode;
						}

						return (sm && sm.getSelection && sm.getSelection()[0]) || null;
					},
					navigateSibling = function (currentRec, direction) {
						var node = view.getNode && view.getNode(currentRec),
							sibling,
							siblingRec;

						if (!node) {
							return;
						}

						sibling = direction === "next" ?
							node.nextElementSibling :
							node.previousElementSibling;
						if (!sibling) {
							return;
						}

						siblingRec = view.getRecord && view.getRecord(sibling);
						if (!siblingRec) {
							return;
						}

						// Move focus only; selection is toggled explicitly with Space/
						// Enter, so navigating never changes the multi-selection.
						focusRowEl(sibling);
						sibling.focus();
					};

				view.el.dom.addEventListener("focus", function (e) {
					var row = e.target;

					while (row && row !== view.el.dom && !Ext.fly(row).hasCls("x-grid-item")) {
						row = row.parentNode;
					}
					if (row && row !== view.el.dom) {
						focusRowEl(row);
					}
				}, true);

				view.el.dom.addEventListener("mousedown", function (e) {
					var row = e.target;

					while (row && row !== view.el.dom && !Ext.fly(row).hasCls("x-grid-item")) {
						row = row.parentNode;
					}
					if (row && row !== view.el.dom) {
						focusRowEl(row);
					}
				}, true);

				var smRuntime = treePanel.getSelectionModel && treePanel.getSelectionModel();
				if (smRuntime && smRuntime.on) {
					smRuntime.on("selectionchange", syncFocusedRow);
				}
				treePanel.on("itemexpand", syncFocusedRow);
				treePanel.on("itemcollapse", syncFocusedRow);

				view.el.dom.addEventListener("keydown", function (e) {
					var key = e.keyCode,
						rec = resolveRec(),
						isLeaf,
						isExpanded;

					if (Ext.getBody()) {
						Ext.getBody().addCls("lk-keyboard-focus-mode");
					}

					if (key === 13) {
						// Always handle + stop Enter so it never reaches the framework
						// navigation model onKeyEnter, which reads record.data and throws
						// when our custom keyboard handling left no navigation position.
						e.preventDefault();
						e.stopPropagation();
						if (e.stopImmediatePropagation) {
							e.stopImmediatePropagation();
						}
						if (!rec) {
							return;
						}
						if (Ext.isFunction(opts.onActivate)) {
							opts.onActivate(rec);
							return;
						}
						isLeaf = Ext.isFunction(rec.isLeaf) ? rec.isLeaf() : true;
						if (!isLeaf) {
							if (opts.enterTogglesFolder) {
								isExpanded = Ext.isFunction(rec.isExpanded) ? rec.isExpanded() : false;
								if (isExpanded) {
									rec.collapse();
								} else {
									expand(rec);
								}
							}
							return;
						}
						// Leaf node: toggle selection (select if not selected, deselect
						// if already selected). Enter mirrors Space here.
						var smEnter = treePanel.getSelectionModel && treePanel.getSelectionModel();
						if (smEnter) {
							if (smEnter.isSelected(rec)) {
								smEnter.deselect(rec);
							} else {
								smEnter.select(rec, true);
							}
						}
						return;
					}

					if (key === 32) {
						e.preventDefault();
						e.stopPropagation();
						if (e.stopImmediatePropagation) {
							e.stopImmediatePropagation();
						}
						if (!rec) {
							return;
						}
						isLeaf = Ext.isFunction(rec.isLeaf) ? rec.isLeaf() : true;
						if (!isLeaf) {
							if (opts.enterTogglesFolder) {
								isExpanded = Ext.isFunction(rec.isExpanded) ? rec.isExpanded() : false;
								if (isExpanded) {
									rec.collapse();
								} else {
									expand(rec);
								}
							}
							return;
						}
						var sm = treePanel.getSelectionModel && treePanel.getSelectionModel();
						if (sm) {
							if (sm.isSelected(rec)) {
								sm.deselect(rec);
							} else {
								sm.select(rec, true);
							}
						}
						return;
					}

					if (!rec) {
						return;
					}

					// Up / Down move between visible tree nodes (siblings).
					if (key === 38 || key === 40) {
						e.preventDefault();
						e.stopPropagation();
						if (e.stopImmediatePropagation) {
							e.stopImmediatePropagation();
						}
						navigateSibling(rec, key === 40 ? "next" : "prev");
						return;
					}

					// Right / Left expand / collapse folder nodes (resource-
					// management behaviour): leaves are a no-op; Right expands a
					// collapsed folder, Left collapses an expanded folder. No
					// move-into-child / move-to-parent.
					if (key === 39 || key === 37) {
						e.preventDefault();
						e.stopPropagation();
						if (e.stopImmediatePropagation) {
							e.stopImmediatePropagation();
						}
						isLeaf = Ext.isFunction(rec.isLeaf) ? rec.isLeaf() : true;
						if (isLeaf) {
							return;
						}
						isExpanded = Ext.isFunction(rec.isExpanded) ? rec.isExpanded() : false;
						if (key === 39 && !isExpanded) {
							expand(rec);
						} else if (key === 37 && isExpanded) {
							rec.collapse();
						}
						return;
					}

				}, true);
			};

		if (treePanel.rendered && treePanel.getView() && treePanel.getView().rendered) {
			ready();
		} else {
			treePanel.on("viewready", ready, null, { single : true });
		}
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
        tabKey = Ext.event.Event.TAB || 9,
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
            enterKey = Ext.event.Event.ENTER || 13,
            spaceKey = Ext.event.Event.SPACE || 32;

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
            enterKey = e.ENTER || Ext.event.Event.ENTER || 13,
            spaceKey = e.SPACE || Ext.event.Event.SPACE || 32,
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
        spaceKey = e.SPACE || Ext.event.Event.SPACE || 32,
        record;

        if (key === (Ext.event.Event.TAB || 9) && config.trapFocus !== false) {
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
            key === (Ext.event.Event.TAB || 9) &&
            config.activateRows &&
            this.isHeaderPopupRowTarget(popup, target)) {
            if (this.focusHeaderPopupAdjacentElement(popup, target, e.shiftKey)) {
                e.stopEvent();
                return false;
            }
        }

        if (
            key === (Ext.event.Event.TAB || 9) &&
            !e.shiftKey &&
            this.isHeaderPopupPrimaryButtonTarget(popup, config, target)) {
            if (this.focusHeaderPopupAdjacentElement(popup, target, false)) {
                e.stopEvent();
                return false;
            }
        }

        if (
            key === (Ext.event.Event.TAB || 9) &&
            e.shiftKey &&
            this.isHeaderPopupCloseTool(target, popup)) {
            if (this.focusHeaderPopupAdjacentElement(popup, target, true)) {
                e.stopEvent();
                return false;
            }
        }

        if (
            config.skipEmptyRowsOnTab &&
            key === (Ext.event.Event.TAB || 9) &&
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
        upKey = Ext.event.Event.UP || 38,
        downKey = Ext.event.Event.DOWN || 40,
        leftKey = Ext.event.Event.LEFT || 37,
        rightKey = Ext.event.Event.RIGHT || 39,
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

        // Right / Left expand / collapse folder nodes (resource-management
        // behaviour): leaves are a no-op; Right expands a collapsed folder,
        // Left collapses an expanded folder. No move-into-child / parent.
        if (record.isLeaf && record.isLeaf()) {
            return false;
        }
        if (key === rightKey && record.expand &&
            !(record.isExpanded && record.isExpanded())) {
            e.stopEvent();
            record.expand();
            return true;
        }
        if (key === leftKey && record.collapse &&
            record.isExpanded && record.isExpanded()) {
            e.stopEvent();
            record.collapse();
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
            if (view && view.el) {
                view.el.select('.lk-popup-row-focused').removeCls('lk-popup-row-focused');
            }
            Ext.fly(row).addCls('lk-popup-row-focused');
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

            // A combo focusTarget (e.g. the "View"/departmentFilter combo) opted into the
            // header keyboard pipeline expands its dropdown on Enter. The Enter that closed
            // this popup is still down/repeating when focus lands back on the combo, so
            // onHeaderComboSpecialKey would immediately re-open its list. Set the
            // leankorEnterSelecting guard it already checks so the close keystroke doesn't
            // bleed into an expand, then clear it once the keystroke has settled.
            if (focusTarget.isComponent && focusTarget.leankorHeaderViewCombo) {
                focusTarget.leankorEnterSelecting = true;
                Ext.defer(function () {
                    if (!focusTarget.destroyed) {
                        focusTarget.leankorEnterSelecting = false;
                    }
                }, 250);
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
            if (popup.isXType && popup.isXType('treepanel')) {
                this.wireTreePopupAria(popup);
            }
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
        dom.setAttribute('role', role);
        dom.setAttribute('aria-selected', selected ? 'true' : 'false');
        if (record && record.getDepth) {
            dom.setAttribute('aria-level', String(record.getDepth() + 1));
        }
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
                enterKey = Ext.event.Event.ENTER || 13,
                spaceKey = Ext.event.Event.SPACE || 32;

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
            spaceKey = e.SPACE || Ext.event.Event.SPACE || 32;

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
    }
    },

	eventFocusCls : "lk-board-event-focused",
	rowFocusCls : "lk-board-row-focused",

	wireGridAriaIndices : function (grid) {
		var apply,
			store;

		if (!grid || !grid.getView || grid.leankorGridAriaIndicesWired) {
			return;
		}

		grid.leankorGridAriaIndicesWired = true;
		apply = function () {
			var view = grid.getView(),
				viewDom = view && view.el && view.el.dom,
				store = view && view.getStore && view.getStore(),
				total = store && store.getCount ? store.getCount() : 0,
				headerCt = grid.headerCt || (grid.lockedGrid && grid.lockedGrid.headerCt),
				cols = headerCt && headerCt.getVisibleGridColumns
					? headerCt.getVisibleGridColumns()
					: [],
				rows,
				i;

			if (!viewDom) {
				return;
			}

			viewDom.setAttribute("role", "grid");
			viewDom.setAttribute("aria-rowcount", total);
			viewDom.setAttribute("aria-colcount", cols.length);

			Ext.Array.forEach(cols, function (column, index) {
				if (column.el && column.el.dom) {
					column.el.dom.setAttribute("role", "columnheader");
					column.el.dom.setAttribute("aria-colindex", String(index + 1));
				}
			});

			rows = viewDom.querySelectorAll(".x-grid-item, tr.x-grid-row");
			for (i = 0; i < rows.length; i++) {
				var row = rows[i],
					record = view.getRecord && view.getRecord(row),
					cells = row.querySelectorAll("td.x-grid-cell"),
					c;

				row.setAttribute("role", "row");
				row.setAttribute("aria-rowindex", String(i + 1));
				if (record && record.isLeaf && !record.isLeaf()) {
					row.setAttribute(
						"aria-expanded",
						record.isExpanded && record.isExpanded() ? "true" : "false"
					);
				}
				for (c = 0; c < cells.length; c++) {
					cells[c].setAttribute("role", "gridcell");
					cells[c].setAttribute("aria-colindex", String(c + 1));
				}
			}
		};

		if (grid.rendered && grid.getView() && grid.getView().rendered) {
			apply();
		} else {
			grid.on("viewready", apply, null, { single : true });
		}

		grid.on("viewready", apply);
		store = grid.getStore && grid.getStore();
		if (store) {
			store.on("refresh", apply);
			store.on("datachanged", apply);
			store.on("sort", apply);
			store.on("filterchange", apply);
		}
	},

	initGridKeyboardNavigation : function (grid, opts) {
		if (!grid || !grid.getView || grid.leankorGridKeyboardNavigationWired) {
			return;
		}

		grid.leankorGridKeyboardNavigationWired = true;
		opts = opts || {};

		var me = this,
			view = grid.getView && grid.getView(),
			ready = function () {
				var dom = view && view.el && view.el.dom;

				if (!dom) {
					return;
				}

				// The grid view must NOT be a tab stop. If it is focusable the
				// whole grid receives the keyboard focus ring (.x-grid-view:focus)
				// instead of an individual row. Keyboard entry into the grid is
				// handled by focusFirstGridRow (which focuses a row), and the
				// keydown listener below is bound in the capture phase so it still
				// receives arrow keys while a row (a descendant) holds focus.
				dom.setAttribute("tabindex", "-1");

				var gotoRow = function (idx) {
					var store = view.getStore && view.getStore(),
						total = store && store.getCount && store.getCount(),
						rec,
						node,
						selectionModel;

					if (!store || !total) {
						return null;
					}

					idx = Math.max(0, Math.min(total - 1, idx));
					rec = store.getAt(idx);
					if (!rec) {
						return null;
					}

					selectionModel = grid.getSelectionModel && grid.getSelectionModel();
					if (selectionModel) {
						selectionModel.select(rec);
					}
					// Move focus to the row element itself so the focus ring shows
					// on the row (via the lk-board-row-focused class), not on the
					// whole grid. Fall back to Ext's focusRow only if the row node
					// can't be resolved.
					node = view.getNode && view.getNode(rec);
					if (node) {
						me.focusGridRow(node);
					} else if (Ext.isFunction(view.focusRow)) {
						try {
							view.focusRow(rec);
						} catch (ignore) {}
					}
					if (Ext.isFunction(opts.announceRowFn)) {
						me.announce(opts.announceRowFn(rec, idx, total));
					}
					return rec;
				};

				dom.addEventListener("keydown", function (e) {
					var key = e.keyCode || e.which,
						upKey = Ext.event.Event.UP || 38,
						downKey = Ext.event.Event.DOWN || 40,
						leftKey = Ext.event.Event.LEFT || 37,
						rightKey = Ext.event.Event.RIGHT || 39,
						enterKey = Ext.event.Event.ENTER || 13,
						escKey = Ext.event.Event.ESC || 27,
						homeKey = Ext.event.Event.HOME || 36,
						endKey = Ext.event.Event.END || 35,
						spaceKey = Ext.event.Event.SPACE || 32,
						store,
						selectionModel,
						record,
						rowIdx,
						total,
						isTreeRecord,
						parentIdx;

					if (
						key !== upKey &&
						key !== downKey &&
						key !== leftKey &&
						key !== rightKey &&
						key !== enterKey &&
						key !== escKey &&
						key !== homeKey &&
						key !== endKey &&
						key !== spaceKey) {
						return;
					}

					store = view.getStore && view.getStore();
					if (!store || !store.getCount || !store.getCount()) {
						return;
					}

					selectionModel = grid.getSelectionModel && grid.getSelectionModel();
					total = store.getCount();

					// Track the CURRENTLY FOCUSED row (rows are focused via
					// focusGridRow), not the selection. Tab-entry focuses a row
					// without selecting it, so reading the selection makes the
					// arrow keys start from the wrong (or no) position and appear
					// dead.
					record = me.getFocusedGridRecord(view) ||
						(selectionModel && selectionModel.getSelection && selectionModel.getSelection()[0]);
					rowIdx = record ? store.indexOf(record) : -1;
					isTreeRecord = record && Ext.isFunction(record.isLeaf);

					if (key === downKey) {
						e.preventDefault();
						e.stopPropagation();
						gotoRow(rowIdx + 1);
					} else if (key === upKey) {
						e.preventDefault();
						e.stopPropagation();
						gotoRow(rowIdx - 1);
					} else if (key === homeKey) {
						e.preventDefault();
						e.stopPropagation();
						gotoRow(0);
					} else if (key === endKey) {
						e.preventDefault();
						e.stopPropagation();
						gotoRow(total - 1);
					} else if (key === rightKey) {
						// Treegrid RIGHT (resource-management behaviour): expand a
						// collapsed folder only — no move-into-child. Leaf rows and
						// already-expanded folders are left as-is. Use the guarded
						// expanded-check (isGridRecordExpanded) so a record whose
						// isExpanded() is missing/throws can't kill the key, and
						// always consume the key on an expandable folder so the
						// Scheduler's own Left/Right cell/scroll handling can't run.
						if (me.isExpandableGridRecord(record)) {
							e.preventDefault();
							e.stopPropagation();
							me.toggleGridFolder(view, record, true);
						}
					} else if (key === leftKey) {
						// Treegrid LEFT (ARIA tree pattern):
						//   expanded folder -> collapse it
						//   otherwise       -> move to the parent folder
						if (me.isExpandableGridRecord(record) && me.isGridRecordExpanded(record)) {
							e.preventDefault();
							e.stopPropagation();
							me.toggleGridFolder(view, record, false);
						} else if (
							isTreeRecord &&
							record.parentNode &&
							Ext.isFunction(record.parentNode.isRoot) &&
							!record.parentNode.isRoot()) {
							e.preventDefault();
							e.stopPropagation();
							parentIdx = store.indexOf(record.parentNode);
							if (parentIdx >= 0) {
								gotoRow(parentIdx);
							}
						}
					} else if (key === enterKey || key === spaceKey) {
						// Enter/Space SELECTS the focused row — it never expands or
						// collapses a folder (that is Left/Right only). The row is
						// already selected during arrow navigation; re-assert the
						// selection and defer to the panel's activate handler when
						// one is wired.
						if (record) {
							e.preventDefault();
							e.stopPropagation();
							if (selectionModel) {
								selectionModel.select(record);
							}
							if (Ext.isFunction(opts.onActivate)) {
								opts.onActivate(record, e);
							}
						}
					} else if (key === escKey) {
						me.restoreFocus();
					}
				}, true);

				// Paint the keyboard focus ring when a row receives focus
				// directly (e.g. Tab lands on the roving-anchor row of a grid
				// that has no header "+" entry, like Resource Schedule). The
				// board CSS suppresses the native :focus ring and shows it via
				// the lk-board-row-focused class instead, which arrow nav adds
				// through focusGridRow — but a plain Tab-in never calls that, so
				// the row would focus invisibly. Only act in keyboard mode so a
				// mouse click never paints the ring.
				dom.addEventListener("focusin", function (e) {
					var rowEl;

					if (!me.keyboardFocusActive) {
						return;
					}
					// Don't paint the row when focus is on a scheduler event bar
					// (or utilization interval) inside a timeline row: the event
					// itself carries the focus ring (lk-board-event-focused), so
					// painting its containing row would outline the WHOLE row
					// instead of just the event.
					if (e.target && e.target.closest &&
						(e.target.closest(".sch-event") ||
							e.target.closest(".gnt-resource-utilization-interval"))) {
						return;
					}
					rowEl = e.target && e.target.closest &&
						e.target.closest(".x-grid-item");
					if (!rowEl || !dom.contains(rowEl) ||
						Ext.fly(rowEl).hasCls(me.rowFocusCls)) {
						return;
					}
					me.clearFocusedRows();
					Ext.fly(rowEl).addCls(me.rowFocusCls);
				}, true);
			};

		if (view && view.rendered) {
			ready();
		} else if (view && view.on) {
			view.on("viewready", ready, null, { single : true });
		}
	},

	wireTreePopupAria : function (treePanel) {
		var apply,
			schedule,
			store;

		if (!treePanel || treePanel.leankorTreePopupAriaWired) {
			return;
		}

		treePanel.leankorTreePopupAriaWired = true;
		apply = function () {
			var view,
				viewDom,
				rows;

			if (treePanel.destroyed || treePanel.isDestroyed) {
				return;
			}

			view = treePanel.getView && treePanel.getView();
			viewDom = view && view.el && view.el.dom;
			if (!viewDom) {
				return;
			}

			viewDom.setAttribute("role", "tree");
			if (treePanel.multiSelect) {
				viewDom.setAttribute("aria-multiselectable", "true");
			}

			rows = viewDom.querySelectorAll(".x-grid-item");
			Ext.Array.forEach(rows, function (row) {
				var record = view.getRecord && view.getRecord(row),
					label = record &&
						record.get &&
						(record.get("Name") || record.get("name") || record.get("text")),
					tr = row.querySelector("tr");

				if (!record) {
					return;
				}

				row.setAttribute("role", "treeitem");
				if (label) {
					row.setAttribute("aria-label", Ext.htmlEncode(label));
				}
				if (tr) {
					Ext.Array.forEach(
						["aria-level", "aria-expanded", "aria-selected"],
						function (attr) {
							var value = tr.getAttribute(attr);

							if (value !== null) {
								row.setAttribute(attr, value);
							}
						}
					);
				}
			});
		};
		schedule = function () {
			Ext.defer(apply, 50);
		};
		store = treePanel.getStore && treePanel.getStore();

		if (store) {
			store.on("refresh", schedule);
			store.on("datachanged", schedule);
			store.on("load", schedule);
			treePanel.on("beforedestroy", function () {
				store.un("refresh", schedule);
				store.un("datachanged", schedule);
				store.un("load", schedule);
			});
		}
		treePanel.on("itemexpand", schedule);
		treePanel.on("itemcollapse", schedule);
		treePanel.on("selectionchange", schedule);

		if (treePanel.rendered) {
			schedule();
		} else {
			treePanel.on("afterrender", schedule, null, { single : true });
		}
	},

	wireSplitterKeyboard : function (panel, opts) {
		opts = opts || {};
		var me = this,
			min = opts.min || 80,
			maxRatio = opts.maxRatio || 0.8,
			apply = function () {
				var splitter = panel && panel.down && panel.down("splitter"),
					dom = splitter && splitter.el && splitter.el.dom,
					lockedGrid = panel && panel.lockedGrid,
					maxWidth,
					updateAria;

				if (!dom || dom.leankorSplitterKeyboardBound || !lockedGrid) {
					return;
				}

				dom.leankorSplitterKeyboardBound = true;
				// Tell ExtJS this splitter is a real, focusable tab stop so the
				// FocusManager / focusableContainer logic agrees with the DOM
				// tabindex instead of fighting it.
				splitter.focusable = true;
				splitter.tabIndex = 0;
				dom.setAttribute("tabindex", "0");
				maxWidth = function () {
					var panelW = (panel.getWidth && panel.getWidth()) || window.innerWidth;

					return Math.max(min + 100, Math.floor(panelW * maxRatio));
				};
				updateAria = function () {
					dom.setAttribute("role", "separator");
					dom.setAttribute("aria-orientation", "vertical");
					dom.setAttribute(
						"aria-label",
						opts.ariaLabel ||
						((typeof Locale !== "undefined" &&
							Locale.LocaleName &&
							Locale.LocaleName.ResizeDividerLabel) ||
							"Resize divider")
					);
					dom.setAttribute("aria-valuemin", String(min));
					dom.setAttribute("aria-valuemax", String(maxWidth()));
					dom.setAttribute("aria-valuenow", String(lockedGrid.getWidth()));
				};

				updateAria();
				dom.addEventListener("focus", function () {
					dom.classList.add("x-splitter-focus");
				});
				dom.addEventListener("blur", function () {
					dom.classList.remove("x-splitter-focus");
				});
				dom.addEventListener("keydown", function (e) {
					var key = e.keyCode,
						newWidth;

					if (key !== 36 && key !== 35) {
						return;
					}

					newWidth = key === 36 ? min : maxWidth();
					if (newWidth === lockedGrid.getWidth()) {
						return;
					}

					e.preventDefault();
					e.stopPropagation();
					lockedGrid.setWidth(newWidth);
					if (panel.updateLayout) {
						panel.updateLayout();
					}
					updateAria();
					me.announce(
						(typeof Locale !== "undefined" &&
							Locale.LocaleName &&
							Locale.LocaleName.ColumnWidthMessage)
							? Ext.String.format(Locale.LocaleName.ColumnWidthMessage, newWidth)
							: "Width " + newWidth + " pixels"
					);
				});

				if (lockedGrid.on) {
					lockedGrid.on("resize", function () {
						updateAria();
					});
				}
			},
			// The locking grid recreates the splitter DOM on layout / reconfigure /
			// partner-view toggles. The new element loses its tabindex + keydown +
			// ARIA wiring (apply()'s guard keys off the per-element bound flag), so
			// re-run apply on those events to keep the divider a stable, in-sequence
			// tab stop instead of an intermittent one. Buffered to coalesce bursts.
			rewire = Ext.Function.createBuffered(apply, 50);

		if (!panel) {
			return;
		}

		if (panel.rendered) {
			apply();
		} else {
			panel.on("afterrender", apply, null, { single : true });
		}

		panel.on("afterlayout", rewire);
		if (panel.lockedGrid && panel.lockedGrid.on) {
			panel.lockedGrid.on("reconfigure", rewire);
			panel.lockedGrid.on("resize", rewire);
		}
	},

	// Move keyboard focus to the board's column divider (the locked-grid splitter
	// wired by wireSplitterKeyboard). Called after a header filter repopulates the
	// board so keyboard users land on the resize divider instead of being left on
	// the (now reset) filter combo. Keyboard-only: a mouse-driven filter must not
	// have focus yanked or a focus border painted, matching lk-keyboard-focus-mode
	// usage elsewhere.
	focusBoardSplitter : function (panel) {
		var board = panel ||
				(typeof LeankorApp !== "undefined" && LeankorApp.Gantt && LeankorApp.Gantt.gantt),
			splitter,
			dom,
			active;

		// Keyboard-only: a mouse/touch-driven filter must never have focus yanked
		// to the divider. Previously only the focus *border* was gated (via CSS on
		// lk-keyboard-focus-mode) while the actual focus() ran for everyone, which
		// caused focus to jump to the divider from unrelated elements.
		if (!this.keyboardFocusActive) {
			return false;
		}

		if (!board) {
			return false;
		}

		// Prefer the splitter component; fall back to the rendered .x-splitter DOM
		// inside the board in case it isn't reachable via component query.
		splitter = board.down && board.down("splitter");
		dom = (splitter && splitter.el && splitter.el.dom) ||
			(board.el && board.el.dom && board.el.dom.querySelector(".x-splitter"));

		if (!dom) {
			return false;
		}

		// Only land on the divider if focus is still where the filter left it —
		// the (now reset) combo/field or nothing. If the user has already moved
		// focus elsewhere, do not override that deliberate move.
		active = document.activeElement;
		if (active && active !== document.body &&
			!/x-form-field|x-combo/.test(active.className || "") &&
			!(dom.contains && dom.contains(active))) {
			return false;
		}

		// tabindex is owned by wireSplitterKeyboard — make sure the divider is
		// actually wired (and thus a real in-sequence tab stop) before focusing,
		// so we never land on a half-configured element.
		if (!dom.leankorSplitterKeyboardBound) {
			this.wireSplitterKeyboard(board);
		}
		if (dom.getAttribute("tabindex") === null) {
			return false;
		}
		dom.focus();
		return true;
	},

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
		me.wireGridAriaIndices(panel);
		if (panel.lockedGrid) {
			me.wireGridAriaIndices(panel.lockedGrid);
		}
		if (panel.normalGrid) {
			me.wireGridAriaIndices(panel.normalGrid);
		}
		me.wireSplitterKeyboard(panel);
		me.bindSchedulingView(panel, schedulingView);
		me.initGridKeyboardNavigation(panel.lockedGrid || panel, {
			announceRowFn: function (record, idx, total) {
				return me.getGridRowAnnouncement(record, idx, total);
			}
		});
		// On a locking board the locked (tree) grid owns BOTH row navigation and
		// the row focus ring, and Left/Right expand/collapse its parent nodes. The
		// normal grid is the timeline panel — its keyboard interaction is the event
		// bars (handled by bindSchedulingView), so it must NOT capture row arrow-nav
		// or paint a row focus ring; otherwise the ring shows on the timeline rows
		// instead of only on the tree rows. Wire the normal grid only when there is
		// no locked grid (a non-locking board).
		if (panel.normalGrid && !panel.lockedGrid) {
			me.initGridKeyboardNavigation(panel.normalGrid, {
				announceRowFn: function (record, idx, total) {
					return me.getGridRowAnnouncement(record, idx, total);
				}
			});
		}
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

		view.el.on("keydown", function (e, target) {
			me.onSchedulingViewKeyDown(panel, view, e, target);
		});

		me.wireEventKeyboardNavigation(panel, view);

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

		// Single focus indicator across the whole board (resource-management
		// approach): exactly one element shows a focus border at a time. On
		// every focus change, strip the board focus classes from any element
		// that does NOT contain the newly focused element, so the previous
		// border is removed the moment focus moves elsewhere. The element that
		// now holds focus keeps / re-receives its class via its own handler
		// (focusGridRow / onEventFocusIn) plus the :focus border. Capture phase
		// so this runs before those add-class handlers.
		document.addEventListener(
			"focusin",
			function (e) {
				var active = e && e.target,
					marked,
					i,
					el;

				if (!active) {
					return;
				}
				// Includes the splitter's ExtJS focus class (.x-splitter-focus):
				// ExtJS sometimes leaves it on a blurred splitter, so a row +
				// the splitter could both show a border. Strip every marked
				// element that does not contain the new focus target.
				marked = document.querySelectorAll(
					"." + me.rowFocusCls + ", ." + me.eventFocusCls +
						", .x-splitter-focus");
				for (i = 0; i < marked.length; i++) {
					el = marked[i];
					if (el !== active && !(el.contains && el.contains(active))) {
						Ext.fly(el).removeCls(me.rowFocusCls);
						Ext.fly(el).removeCls(me.eventFocusCls);
						Ext.fly(el).removeCls("x-splitter-focus");
					}
				}
			},
			true
		);
	},

	isKeyboardFocusKey : function (e) {
		var key = e.getKey && e.getKey(),
			modifierKeys = [
				Ext.event.Event.SHIFT || 16,
				Ext.event.Event.CTRL || 17,
				Ext.event.Event.ALT || 18,
				Ext.event.Event.CAPS_LOCK || 20,
				Ext.event.Event.META || 91
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

		panel.el.on("focusin", function (e, target) {
			me.onHeaderAddButtonFocusIn(panel, e, target);
		});

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
			utilizationPanel = me.isUtilizationPanel(panel),
			items,
			active,
			anchor = null;

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

		// Roving tabindex for the timeline. prepareEventNode / prepareIntervalNode
		// above make EVERY focusable item a Tab stop, and this method re-runs on
		// timers/data changes — which kept wiping the roving tabindex that
		// focusEvent sets, leaving the whole timeline tabbable so Tab got stuck
		// cycling through every item. Keep exactly ONE item tabbable: the one
		// that currently has focus (so re-syncs don't move the Tab stop), else
		// the first. Arrow keys move between items; Tab then exits the timeline.
		items = utilizationPanel
			? view.el.select(".gnt-resource-utilization-interval:not([aria-hidden='true'])").elements
			: view.el.select(view.eventSelector).elements;
		active = (typeof document !== "undefined") ? document.activeElement : null;

		Ext.Array.forEach(items, function (el) {
			if (el === active || Ext.fly(el).hasCls(me.eventFocusCls)) {
				anchor = el;
			}
		});
		if (!anchor && items.length) {
			anchor = items[0];
		}
		Ext.Array.forEach(items, function (el) {
			el.setAttribute("tabindex", el === anchor ? "0" : "-1");
		});

		// Strip Bryntum's internal tab stops (RM parity). Bryntum ships several
		// scroll / axis / subgrid containers with tabindex=0; left as-is, Tab
		// walks those invisible containers and feels trapped inside the timeline.
		// The event bars / intervals above are the only intended timeline tab
		// stops, so force every OTHER tabindex node to -1. Re-run on each sync so
		// re-renders never reintroduce them.
		me.neutralizeTimelineTabStops(view.el && view.el.dom);
	},

	// Force every tabindex node under the scheduling view to -1 except the
	// focusable event bars / utilization intervals (whose roving tabindex is
	// managed by syncSchedulingView). Mirrors resource-management's
	// neutralizeTimelineTabStops so Tab never gets stuck on Bryntum's own
	// scroll / axis containers.
	neutralizeTimelineTabStops : function (viewDom) {
		var preserve = ".sch-event, .gnt-resource-utilization-interval";

		if (!viewDom || !viewDom.querySelectorAll) {
			return;
		}

		Ext.Array.each(viewDom.querySelectorAll("[tabindex]"), function (node) {
			if (node.closest && node.closest(preserve)) {
				return;
			}
			if (node.getAttribute("tabindex") !== "-1") {
				node.setAttribute("tabindex", "-1");
			}
		});

		// The view container itself, if Bryntum left it tabbable.
		if (viewDom.getAttribute &&
			viewDom.getAttribute("tabindex") !== null &&
			viewDom.getAttribute("tabindex") !== "-1" &&
			!(viewDom.closest && viewDom.closest(preserve))) {
			viewDom.setAttribute("tabindex", "-1");
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
		gridView.el.dom.setAttribute("role", "treegrid");

		gridView.el
			.select(me.getGridFocusSelector(gridView))
			.each(function (rowEl) {
				me.prepareGridRow(rowEl, gridView);
			});

		// Keyboard entry into the grid. prepareGridRow above leaves every row
		// at tabindex=-1; the normal entry point is the header "+" button
		// (.addBtnTop) whose Tab handler calls focusFirstGridRow. Resource
		// Schedule in resource-utilization mode clears that header, so without
		// an anchor the grid has NO Tab stop and keyboard focus can never enter
		// it. Mirror the timeline's roving anchor: when the panel has no
		// add-button entry, make exactly ONE row (the focused/selected one,
		// else the first) tabbable so Tab lands on a real row. Boards that keep
		// the "+" button are untouched.
		me.ensureGridRovingAnchor(gridView);
	},

	// Make exactly one grid row a Tab stop (roving anchor) so keyboard focus
	// can enter a grid that has no header "+" entry button. No-op when the
	// owning panel still exposes a .addBtnTop entry (its existing
	// add-button -> focusFirstGridRow flow already handles entry) or when the
	// grid has no rows yet.
	ensureGridRovingAnchor : function (gridView) {
		var me = this,
			panel = me.getGridPanel(gridView),
			rows,
			anchor,
			active;

		if (!gridView || !gridView.el) {
			return;
		}
		if (panel && panel.el && panel.el.down(".addBtnTop")) {
			return;
		}

		rows = gridView.el.select(me.getGridFocusSelector(gridView)).elements;
		if (!rows || !rows.length) {
			return;
		}

		active = (typeof document !== "undefined") ? document.activeElement : null;
		Ext.Array.forEach(rows, function (el) {
			if (
				el === active ||
				el.getAttribute("tabindex") === "0" ||
				Ext.fly(el).hasCls(me.rowFocusCls)) {
				anchor = el;
			}
		});
		if (!anchor) {
			anchor = rows[0];
		}
		Ext.Array.forEach(rows, function (el) {
			el.setAttribute("tabindex", el === anchor ? "0" : "-1");
		});
	},

	setPanelAccessibility : function (panel) {
		var label = this.getPanelLabel(panel);

		if (panel && panel.el && label) {
			panel.el.dom.setAttribute("role", "region");
			panel.el.dom.setAttribute("aria-label", label);
		}
	},

	syncHeaderAddButtons : function (panel) {
		var me = this,
			label = this.getHeaderAddButtonLabel();

		if (!panel.el) {
			return;
		}

		panel.el.select(".addBtnTop").each(function (buttonEl) {
			var headerEl = buttonEl.up(".x-column-header");

			if (headerEl && headerEl.dom) {
				headerEl.dom.setAttribute("tabindex", "-1");
				headerEl.dom.setAttribute("role", "presentation");
				me.clearHeaderAddButtonOuterFocus(headerEl);
				headerEl
					.select(
						".x-column-header-inner, .x-column-header-text, .x-column-header-text-container, .x-column-header-text-wrapper, .x-column-header-title"
					)
					.each(function (innerEl) {
						innerEl.dom.setAttribute("role", "presentation");
					});
			}

			me.prepareHeaderAddButton(buttonEl.dom, label);
		});
	},

	getHeaderAddButton : function (panel) {
		var buttonEl = panel && panel.el && panel.el.down(".addBtnTop");

		return buttonEl && buttonEl.dom ? buttonEl.dom : null;
	},

	prepareHeaderAddButton : function (buttonDom, label) {
		if (!buttonDom) {
			return null;
		}

		label = label || this.getHeaderAddButtonLabel();
		buttonDom.setAttribute("tabindex", "0");
		buttonDom.setAttribute("role", "button");
		buttonDom.setAttribute("aria-label", label);
		buttonDom.setAttribute("title", label);
		return buttonDom;
	},

	focusHeaderAddButton : function (panel) {
		var button = this.prepareHeaderAddButton(this.getHeaderAddButton(panel));

		if (!button) {
			return false;
		}

		this.setKeyboardFocusMode(true);
		this.clearFocusedRows();
		Ext.defer(function () {
			if (!button.ownerDocument || button.ownerDocument.body.contains(button)) {
				button.focus();
			}
		}, 1);
		return true;
	},

	prepareGridRow : function (rowEl, gridView) {
		var dom = rowEl && (rowEl.dom || rowEl),
			record,
			label,
			selected;

		if (!dom) {
			return;
		}

		record = this.getRecordFromRow(dom, gridView);
		selected = this.isGridRecordSelected(gridView, record);
		dom.setAttribute("tabindex", "-1");
		dom.setAttribute("role", "row");
		dom.setAttribute("aria-selected", selected ? "true" : "false");
		dom.setAttribute("aria-level", String(this.getGridRecordLevel(record)));
		if (this.isExpandableGridRecord(record)) {
			dom.setAttribute(
				"aria-expanded",
				record.isExpanded && record.isExpanded() ? "true" : "false"
			);
		} else {
			dom.removeAttribute("aria-expanded");
		}

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
				cellEl.dom.setAttribute("aria-selected", selected ? "true" : "false");
				if (cellLabel) {
					cellEl.dom.setAttribute("aria-label", cellLabel);
				}
			}, this);
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

	prepareEventNode : function (node, tabIndex, panel, view) {
		var dom = node && (node.dom || node);

		if (!dom) {
			return;
		}

		dom.setAttribute("tabindex", String(tabIndex));
		dom.setAttribute("role", tabIndex === -1 ? "presentation" : "gridcell");
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

		// Focus belongs to the event bar alone: drop any lingering row focus
		// ring (e.g. from the resource row the user came from) so only the
		// event shows the keyboard outline, not the whole row.
		this.clearFocusedRows();

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

	onSchedulingViewKeyDown : function (panel, view, e, target) {
		var key = e.getKey && e.getKey(),
			tabKey = Ext.event.Event.TAB || 9,
			targetEl = target && Ext.fly(target);

		if (
			key !== tabKey ||
			!targetEl ||
			!(
				targetEl.is(".sch-event") ||
				targetEl.is(".gnt-resource-utilization-interval") ||
				targetEl.up(".sch-event", view.el, true) ||
				targetEl.up(".gnt-resource-utilization-interval", view.el, true)
			)
		) {
			return true;
		}

		e.stopEvent();
		if (e.shiftKey) {
			this.focusLastGridRow(panel);
		} else if (!this.focusNextFocusableAfterPanel(panel)) {
			this.focusFirstHeaderControl(panel);
		}
		return false;
	},

	wireEventKeyboardNavigation : function (panel, view) {
		var me = this,
			panelDom = panel && panel.el && panel.el.dom,
			utilizationPanel = me.isUtilizationPanel(panel),
			itemSelector = utilizationPanel ?
				".gnt-resource-utilization-interval:not([aria-hidden='true'])" :
				".sch-event",
			lastEventByResource = {},
			lastFocusedEvent = null;

		if (!panelDom || !view || panelDom.leankorEventKeyboardNavBound) {
			return;
		}

		panelDom.leankorEventKeyboardNavBound = true;

		var allEvents = function () {
			var dom = view.el && view.el.dom;

			return dom ?
				Array.prototype.slice.call(dom.querySelectorAll(itemSelector)) :
				[];
		};

		var sortedAllEvents = function () {
			return allEvents().sort(function (a, b) {
				var ar = a.getBoundingClientRect(),
					br = b.getBoundingClientRect();

				if (Math.abs(ar.top - br.top) > 4) {
					return ar.top - br.top;
				}
				return ar.left - br.left;
			});
		};

		var sameRowEvents = function (eventEl) {
			var rect = eventEl.getBoundingClientRect(),
				mid = rect.top + rect.height / 2,
				events = allEvents().filter(function (candidate) {
					var cr = candidate.getBoundingClientRect();

					return cr.top <= mid && cr.bottom >= mid;
				});

			return events.sort(function (a, b) {
				return a.getBoundingClientRect().left -
					b.getBoundingClientRect().left;
			});
		};

		var eventsInRow = function (rowEl) {
			if (!rowEl) {
				return [];
			}

			var rect = rowEl.getBoundingClientRect(),
				events = allEvents().filter(function (eventEl) {
					var er = eventEl.getBoundingClientRect(),
						mid = er.top + er.height / 2;

					return mid >= rect.top && mid <= rect.bottom;
				});

			return events.sort(function (a, b) {
				return a.getBoundingClientRect().left -
					b.getBoundingClientRect().left;
			});
		};

		var resolveEventRecord = function (eventEl) {
			var node = eventEl &&
				eventEl.closest &&
				eventEl.closest(".sch-event");

			return view.resolveEventRecord ?
				view.resolveEventRecord(node || eventEl) :
				null;
		};

		var resolveResourceForEvent = function (eventEl) {
			var eventRecord = resolveEventRecord(eventEl),
				resource,
				lockedView,
				lockedDom,
				rows,
				rect,
				mid,
				i;

			if (eventRecord && eventRecord.getResource) {
				try {
					resource = eventRecord.getResource();
				} catch (ignore) {}
				if (resource) {
					return resource;
				}
			}

			lockedView = panel.lockedGrid &&
				panel.lockedGrid.getView &&
				panel.lockedGrid.getView();
			lockedDom = lockedView && lockedView.el && lockedView.el.dom;
			if (!lockedView || !lockedDom) {
				return null;
			}

			rect = eventEl.getBoundingClientRect();
			mid = rect.top + rect.height / 2;
			rows = lockedDom.querySelectorAll(".x-grid-item, tr.x-grid-row");
			for (i = 0; i < rows.length; i++) {
				var rowRect = rows[i].getBoundingClientRect();

				if (rowRect.top <= mid && rowRect.bottom >= mid) {
					return lockedView.getRecord && lockedView.getRecord(rows[i]);
				}
			}
			return null;
		};

		var focusEvent = function (eventEl) {
			if (!eventEl) {
				return;
			}

			Ext.Array.forEach(allEvents(), function (item) {
				item.setAttribute("tabindex", item === eventEl ? "0" : "-1");
			});
			if (utilizationPanel) {
				var parentEvent = Ext.fly(eventEl).up(".sch-event");

				if (parentEvent) {
					parentEvent
						.select(".gnt-resource-utilization-interval")
						.each(function (intervalEl) {
							if (intervalEl.dom !== eventEl) {
								intervalEl.dom.setAttribute("tabindex", "-1");
							}
						});
				}
			}
			eventEl.focus();

			var record = resolveEventRecord(eventEl),
				name = record &&
					((record.get && (record.get("CustomTaskName") || record.get("Name"))) ||
						(record.getName && record.getName()));

			if (name) {
				me.announce(Ext.htmlEncode(name));
			}
		};

		var focusRow = function (resource) {
			var lockedView = panel.lockedGrid &&
					panel.lockedGrid.getView &&
					panel.lockedGrid.getView(),
				dom = lockedView && lockedView.el && lockedView.el.dom,
				sm = panel.lockedGrid &&
					panel.lockedGrid.getSelectionModel &&
					panel.lockedGrid.getSelectionModel();

			if (!resource || !dom) {
				return false;
			}

			if (sm) {
				try {
					sm.select(resource);
				} catch (ignore) {}
			}
			if (lockedView.focusRow) {
				try {
					lockedView.focusRow(resource);
				} catch (ignore2) {}
			}
			if (!dom.contains(document.activeElement)) {
				if (!dom.hasAttribute("tabindex")) {
					dom.setAttribute("tabindex", "0");
				}
				dom.focus();
			}
			return dom.contains(document.activeElement) || document.activeElement === dom;
		};

		var fireContextMenu = function (eventEl) {
			var eventRecord = resolveEventRecord(eventEl),
				rect,
				fakeEvent;

			if (!eventRecord) {
				return false;
			}

			rect = eventEl.getBoundingClientRect();
			fakeEvent = {
				stopEvent : Ext.emptyFn,
				preventDefault : Ext.emptyFn,
				stopPropagation : Ext.emptyFn,
				getXY : function () {
					return [rect.left + Math.min(rect.width / 2, 80), rect.bottom];
				},
				// Let the eventcontextmenu listener open the menu anchored to the
				// event bar (showBy) instead of raw viewport coords, and focus the
				// first item — mirrors resource-management's keyboard context menu.
				keyboardOpen : true,
				targetEl : eventEl
			};
			me.announce(
				(typeof Locale !== "undefined" &&
					Locale.LocaleName &&
					Locale.LocaleName.ContextMenuOpened) ||
					"Context menu opened"
			);
			panel.fireEvent("eventcontextmenu", panel, eventRecord, fakeEvent);
			return true;
		};

		view.el.dom.addEventListener("focusin", function (event) {
			var eventEl = event.target &&
				event.target.closest &&
				event.target.closest(itemSelector),
				resource,
				id;

			if (!eventEl) {
				return;
			}

			// Remember the most recently focused event so the context-menu keys
			// stay reliable even if focus later drifts off the event bar.
			lastFocusedEvent = eventEl;

			resource = resolveResourceForEvent(eventEl);
			id = resource &&
				((resource.getId && resource.getId()) ||
					(resource.get && (resource.get("Id") || resource.get("ResourceId"))));
			if (id !== null && id !== undefined) {
				lastEventByResource[id] = eventEl;
			}
		});

		document.addEventListener("keydown", function (event) {
			var key = event.keyCode,
				target = event.target,
				active,
				eventEl,
				handled = false;

			if (!target || !panelDom.contains(target)) {
				return;
			}
			if (target.closest && target.closest(".x-panel-header, .x-header")) {
				return;
			}

			active = document.activeElement || target;
			eventEl = active && active.closest && active.closest(".sch-event");
			if (utilizationPanel) {
				eventEl = active &&
					active.closest &&
					active.closest(".gnt-resource-utilization-interval:not([aria-hidden='true'])");
			}
			// Context-menu keys (Enter / Shift+F10 / ContextMenu) must open the
			// menu for the event the user is on. If live focus has drifted off
			// the event bar (a timeline re-render moved it, or focus was not
			// restored after a previous menu closed), fall back to the last
			// focused event so the menu opens reliably instead of intermittently.
			// Gated to focus still being inside the scheduling/timeline view so
			// Enter on a locked-grid resource row keeps selecting (not opening
			// the event menu).
			if (!eventEl &&
				(key === 13 || key === 93 || (key === 121 && event.shiftKey)) &&
				view && view.el && view.el.dom && active &&
				view.el.dom.contains(active) &&
				lastFocusedEvent &&
				document.body.contains(lastFocusedEvent) &&
				panelDom.contains(lastFocusedEvent)) {
				eventEl = lastFocusedEvent;
			}
			if (eventEl) {
				var siblings,
					index,
					resource,
					allSorted;

				if (key === 9) {
					if (event.shiftKey) {
						// Shift+Tab returns to the parallel resource row of this
						// event (RM behaviour); fall back to the last grid row.
						handled = focusRow(resolveResourceForEvent(eventEl)) ||
							me.focusLastGridRow(panel);
						if (handled) {
							eventEl.setAttribute("tabindex", "-1");
						}
					} else {
						handled = me.focusNextFocusableAfterPanel(panel) ||
							me.focusFirstHeaderControl(panel);
					}
				} else if (
					(key === 121 && event.shiftKey) ||
					key === 93 ||
					key === 13
				) {
					handled = fireContextMenu(eventEl);
				} else if (key === 27) {
					resource = resolveResourceForEvent(eventEl);
					handled = focusRow(resource);
					if (handled) {
						eventEl.setAttribute("tabindex", "-1");
					}
				} else if (key === 36 || key === 35) {
					siblings = event.ctrlKey ? sortedAllEvents() : sameRowEvents(eventEl);
					if (siblings.length) {
						focusEvent(key === 36 ? siblings[0] : siblings[siblings.length - 1]);
						handled = true;
					}
				} else if (key === 37 || key === 39) {
					siblings = sameRowEvents(eventEl);
					index = siblings.indexOf(eventEl);
					if (siblings[index + (key === 39 ? 1 : -1)]) {
						focusEvent(siblings[index + (key === 39 ? 1 : -1)]);
						handled = true;
					}
				} else if (key === 38 || key === 40) {
					// Up / Down walk events vertically (sorted top-to-bottom,
					// left-to-right) across rows, matching RM.
					allSorted = sortedAllEvents();
					index = allSorted.indexOf(eventEl);
					if (index !== -1 && allSorted[index + (key === 40 ? 1 : -1)]) {
						focusEvent(allSorted[index + (key === 40 ? 1 : -1)]);
						handled = true;
					}
				}

				if (handled) {
					event.preventDefault();
					event.stopPropagation();
				}
				return;
			}

			if (key !== 37 && key !== 39 && !(key === 9 && !event.shiftKey)) {
				return;
			}

			var lockedView = panel.lockedGrid &&
					panel.lockedGrid.getView &&
					panel.lockedGrid.getView(),
				lockedDom = lockedView && lockedView.el && lockedView.el.dom,
				rowEl,
				rowEvents,
				targetEvent,
				rowRecord,
				rowId;

			if (key === 9 && (!lockedDom || !lockedDom.contains(target))) {
				return;
			}

			rowEl = target.closest && target.closest(".x-grid-item, tr.x-grid-row");
			rowEvents = eventsInRow(rowEl);
			if (!rowEvents.length) {
				allSorted = sortedAllEvents();
				rowEvents = allSorted;
			}
			if (!rowEvents.length) {
				if (key === 9) {
					if (me.focusNextFocusableAfterPanel(panel) ||
						me.focusFirstHeaderControl(panel)) {
						event.preventDefault();
						event.stopPropagation();
					}
				}
				return;
			}

			if (key !== 37 && lockedView && lockedView.getRecord && rowEl) {
				rowRecord = lockedView.getRecord(rowEl);
				rowId = rowRecord &&
					((rowRecord.getId && rowRecord.getId()) ||
						(rowRecord.get && (rowRecord.get("Id") || rowRecord.get("ResourceId"))));
				targetEvent = rowId !== null && rowId !== undefined ?
					lastEventByResource[rowId] :
					null;
				if (targetEvent && rowEvents.indexOf(targetEvent) === -1) {
					targetEvent = null;
				}
			}

			focusEvent(targetEvent || (key === 37 ?
				rowEvents[rowEvents.length - 1] :
				rowEvents[0]));
			event.preventDefault();
			event.stopPropagation();
		}, true);

		view.el.dom.addEventListener("keydown", function (event) {
			var key = event.keyCode || event.which,
				tabKey = Ext.event.Event.TAB || 9,
				target = event.target,
				insideItem = target &&
					target.closest &&
					(target.closest(".sch-event") ||
						target.closest(".gnt-resource-utilization-interval"));

			if (key !== tabKey || insideItem) {
				return;
			}

			if (event.shiftKey) {
				if (me.focusLastGridRow(panel)) {
					event.preventDefault();
					event.stopPropagation();
				}
			} else if (me.focusNextFocusableAfterPanel(panel) ||
				me.focusFirstHeaderControl(panel)) {
				event.preventDefault();
				event.stopPropagation();
			}
		}, true);
	},

	onHeaderAddButtonKeyDown : function (panel, e, target) {
		var key = e.getKey(),
			tabKey = Ext.event.Event.TAB || 9,
			enterKey = Ext.event.Event.ENTER || 13,
			spaceKey = Ext.event.Event.SPACE || 32;

		this.setKeyboardFocusMode(true);

		if (key === tabKey) {
			if (e.shiftKey) {
				if (this.focusLastHeaderControl(panel)) {
					e.stopEvent();
				}
			} else {
				if (this.focusFirstGridRow(panel) || this.focusFirstTimelineItem(panel)) {
					e.stopEvent();
				}
			}
			return;
		}

		if (key === enterKey || key === spaceKey) {
			e.stopEvent();
			this.activateHeaderAddButton(panel, target, e);
		}
	},
	onHeaderAddButtonFocusIn : function (panel, e, target) {
		var me = this,
			targetEl = target && Ext.fly(target),
			headerEl,
			addButton;

		if (!targetEl || !panel || !panel.el) {
			return;
		}

		headerEl = targetEl.is(".nameColumnCls")
			? targetEl
			: targetEl.up(".nameColumnCls", panel.el, true);

		if (!headerEl || !headerEl.dom) {
			return;
		}

		me.setKeyboardFocusMode(true);
		addButton = headerEl.down(".addBtnTop");
		me.clearHeaderAddButtonOuterFocus(headerEl);

		if (
			addButton &&
			addButton.dom &&
			target !== addButton.dom &&
			!targetEl.up(".addBtnTop", headerEl, true)
		) {
			addButton.dom.setAttribute("tabindex", "0");
			addButton.dom.setAttribute("role", "button");
			Ext.defer(function () {
				addButton.dom.focus();
				me.clearHeaderAddButtonOuterFocus(headerEl);
			}, 1);
		}

	},
	clearHeaderAddButtonOuterFocus : function (headerEl) {
		if (!headerEl || !headerEl.dom) {
			return;
		}

		headerEl.removeCls("x-column-header-focus");
		headerEl.dom.setAttribute("tabindex", "-1");
		headerEl
			.select(
				".x-column-header-inner, .x-column-header-text, .x-column-header-text-container, .x-column-header-text-wrapper, .x-column-header-title"
			)
			.each(function (innerEl) {
				innerEl.dom.setAttribute("tabindex", "-1");
			});
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

	focusFirstTimelineItem : function (panel) {
		var view =
				panel &&
				panel.getSchedulingView &&
				panel.getSchedulingView(),
			item;

		if (!view || !view.el) {
			return false;
		}

		item =
			view.el.down(".sch-event[tabindex='0']", true) ||
			view.el.down(".gnt-resource-utilization-interval[tabindex='0']", true) ||
			view.el.down(".sch-event", true) ||
			view.el.down(".gnt-resource-utilization-interval", true);

		if (!item) {
			return false;
		}

		item.setAttribute("tabindex", "0");
		Ext.defer(function () {
			item.focus();
		}, 1);
		return true;
	},

	focusLastGridRow : function (panel) {
		var lockedView =
				panel &&
				panel.lockedGrid &&
				panel.lockedGrid.getView &&
				panel.lockedGrid.getView(),
			rows =
				lockedView &&
				lockedView.el &&
				lockedView.el.select(this.getGridFocusSelector(lockedView)).elements,
			row = rows && rows.length && rows[rows.length - 1];

		if (!row) {
			return false;
		}

		this.focusGridRow(row);
		return true;
	},

	focusFirstHeaderControl : function (panel) {
		var header = panel && panel.header,
			control;

		if (!header || !header.query) {
			return false;
		}

		control = Ext.Array.findBy(header.query("[reference]"), function (cmp) {
			return (
				!cmp.hidden &&
				!(cmp.isDisabled && cmp.isDisabled()) &&
				cmp.el &&
				cmp.el.dom
			);
		});

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

	focusNextFocusableAfterPanel : function (panel) {
		var panelDom = panel && panel.el && panel.el.dom,
			focusables,
			index = -1,
			next,
			i;

		if (!panelDom) {
			return false;
		}

		focusables = Ext.Array.filter(
			Ext.Array.toArray(
				document.querySelectorAll(
					'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
				)
			),
			function (el) {
				return (
					el.offsetParent !== null &&
					!el.disabled &&
					el.getAttribute("aria-hidden") !== "true"
				);
			}
		);

		for (i = 0; i < focusables.length; i++) {
			if (panelDom.contains(focusables[i])) {
				index = i;
			} else if (index !== -1) {
				next = focusables[i];
				break;
			}
		}

		if (!next) {
			return false;
		}

		Ext.defer(function () {
			next.focus();
		}, 1);
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

	getGridRowAnnouncement : function (record, idx, total) {
		var localeName = typeof Locale !== "undefined" && Locale.LocaleName,
			name = this.getRecordLabel(record);

		return Ext.String.format(
			(localeName && localeName.RowAnnouncement) || "{0}, row {1} of {2}",
			Ext.htmlEncode(name || ""),
			idx + 1,
			total
		);
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

	getFocusedGridRecord : function (gridView) {
		var rowEl,
			activeEl,
			activeFly,
			selector;

		if (!gridView || !gridView.el) {
			return null;
		}

		// Prefer the row carrying the focus class — focusGridRow applies it
		// synchronously, while the actual DOM focus is moved on a short defer.
		rowEl = gridView.el.down("." + this.rowFocusCls, true);

		if (!rowEl) {
			activeEl = (typeof document !== "undefined") ? document.activeElement : null;
			if (activeEl && gridView.el.contains(activeEl)) {
				selector = this.getGridFocusSelector(gridView);
				activeFly = Ext.get(activeEl);
				rowEl = activeFly && activeFly.is(selector)
					? activeEl
					: (activeFly ? activeFly.up(selector, gridView.el, true) : null);
			}
		}

		return rowEl ? this.getRecordFromRow(rowEl, gridView) : null;
	},

	isGridRecordSelected : function (gridView, record) {
		var selectionModel =
			gridView &&
			gridView.getSelectionModel &&
			gridView.getSelectionModel();

		selectionModel =
			selectionModel ||
			(gridView &&
				gridView.ownerGrid &&
				gridView.ownerGrid.getSelectionModel &&
				gridView.ownerGrid.getSelectionModel());

		return !!(
			selectionModel &&
			record &&
			selectionModel.isSelected &&
			selectionModel.isSelected(record)
		);
	},

	isExpandableGridRecord : function (record) {
		return !!(
			record &&
			record.isLeaf &&
			!record.isLeaf() &&
			(record.expand || record.collapse)
		);
	},

	// Safe "is this tree row expanded?" check. Tolerates records that have no
	// isExpanded() method (some surrogate Scheduler/Gantt models) so callers can
	// branch on expand/collapse without risking a throw that swallows the keypress.
	isGridRecordExpanded : function (record) {
		return !!(record && record.isExpanded && record.isExpanded());
	},

	// Expand/collapse a tree (folder) record from the keyboard, then keep the
	// focus ring on the same folder row, refresh its aria-expanded state and
	// announce the change for screen readers. `expand` may be true/false to
	// force a state, or omitted to toggle. Returns true if it acted.
	toggleGridFolder : function (view, record, expand) {
		var me = this,
			localeName = (typeof Locale !== "undefined") && Locale.LocaleName,
			isExpanded,
			willExpand,
			template;

		if (!view || !me.isExpandableGridRecord(record)) {
			return false;
		}

		isExpanded = !!(record.isExpanded && record.isExpanded());
		willExpand = (typeof expand === "boolean") ? expand : !isExpanded;

		if (willExpand === isExpanded) {
			return false;
		}

		if (willExpand) {
			record.expand();
			template = (localeName && localeName.FolderExpanded) || "{0}, expanded";
		} else {
			record.collapse();
			template = (localeName && localeName.FolderCollapsed) || "{0}, collapsed";
		}

		// The tree inserts/removes child rows asynchronously. Once it settles,
		// refresh the folder row's ARIA, keep keyboard focus on it, and announce.
		Ext.defer(function () {
			var node = view.getNode && view.getNode(record);

			if (node) {
				me.prepareGridRow(node, view);
				me.focusGridRow(node);
			}
			me.announce(
				Ext.String.format(
					template,
					Ext.htmlEncode(me.getRecordLabel(record) || "")
				)
			);
		}, 30);

		return true;
	},

	getGridRecordLevel : function (record) {
		var depth =
			record &&
			record.getDepth &&
			record.getDepth();

		return Math.max(1, depth || 1);
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
