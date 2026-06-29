/*
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: AssignmentGrid.js
 */
Ext.define('LeankorApp.view.AssignmentGrid', {
	extend: 'Gnt.panel.ResourceUtilization',
	xtype: 'assignmentgridpanel',
	requires: [
		'LeankorApp.view.AssignmentToolTip',
		'LeankorApp.util.AccessibilityUtil',
		'Gnt.plugin.Printable',
	],
	//flex: 1,
	rowHeight: 30,
	//split : true,
	widht: '100%',
	height: '100%',
	recurringEvents : false,
	//border : true,
	itemId: 'asPanel',
	showTodayLine: true,
	numberFormat: '0.000',
	// listeners: {
		// beforecelldblclick: function(){
			// return false;
		// },
		// beforecellclick : function(){
			// return false;
		// }
	// },
	// highlightWeekends: true,
	allowOverlap: false,
	cls: 'backGroudCls',
	ariaLabel: (typeof Locale !== 'undefined' && Locale.LocaleName && Locale.LocaleName.CapacityPlanning) || 'Assignment grid',
	// Easy to style each utilization bar individually with CSS or inline 'style'
	utilizationBarRenderer : function (resourceUtilizationInfo, resource, intervalStartDate, intervalEndDate, metaData) {
	if (resource.getName() === 'Bart') {
	    metaData.cls = 'Bart';
	}
	},


	eventRenderer: function (surrogateEvent, surrogateResource, meta) {
		var EUF = Ext.util.Format,
		me = this,
		view = me.getSchedulingView(),
		startDate = surrogateEvent.getStartDate(),
		msPerHour = 60 * 60 * 1000,
		numberFormat = me.getNumberFormat(),
		result = [],
		eventLeft,
		divLeft,
		divRight,
		statusCls,
		rendererScope = this.utilizationBarRendererScope || this;
		eventLeft = view.getCoordinateFromDate(startDate);
		surrogateEvent.forEachInterval(function (intervalStartDate, intervalEndDate) {
			var resourceUtilizationInfo = surrogateEvent.getUtilizationInfoForInterval(intervalStartDate, intervalEndDate),
			metaData = {},
			value = '?';
			divLeft = view.getCoordinateFromDate(intervalStartDate);
			divRight = view.getCoordinateFromDate(intervalEndDate) - 1;
			if (resourceUtilizationInfo instanceof Ext.Promise) {
				statusCls = 'notcalculated';
			} else {
				if (!resourceUtilizationInfo.isUtilized) {
					statusCls = 'notutilized';
				} else {
					if (resourceUtilizationInfo.isUnderallocated) {
						statusCls = 'underallocated';
					} else {
						if (resourceUtilizationInfo.isOverallocated) {
							statusCls = 'overallocated';
						} else {
							statusCls = 'optimallyallocated';
						}
					}
				}
			}
			if (me.utilizationBarRenderer) {
				me.utilizationBarRenderer.call(rendererScope, resourceUtilizationInfo, surrogateResource, intervalStartDate, intervalEndDate, metaData);
			}

			if (!(resourceUtilizationInfo instanceof Ext.Promise)) {
				if (Number.isInteger((resourceUtilizationInfo.allocationMs / msPerHour))) {
					var numberFormatCustom = '0';
				} else {
					var decimalAfterValue = (resourceUtilizationInfo.allocationMs / msPerHour).toString().split(".")[1].length,
					numberFormatCustom = decimalAfterValue == 0 ? '0' : (decimalAfterValue == 1 ? '0.0' : (decimalAfterValue == 2 ? '0.00' : '0.000'));
				}
				value = EUF.number(resourceUtilizationInfo.allocationMs / msPerHour, numberFormatCustom);
			}
			result.push({
				status: statusCls,
				dir: me.rtl ? 'right' : 'left',
				position: divLeft - eventLeft,
				width: divRight - divLeft,
				startTime: intervalStartDate.getTime(),
				endTime: intervalEndDate.getTime(),
				value: divRight - divLeft > 10 ? value : '',
				style: metaData.style || '',
				cls: metaData.cls || ''
			});
		});
		return result;
	},
	afterRender: function () {
		var me = this;
		me.callParent(arguments);
		if (me.el) {
			me.el.dom.setAttribute('aria-label', me.ariaLabel ||
				(Locale.LocaleName && Locale.LocaleName.ResourceUtilization) || 'Assignment grid');
		}
		// addBtnTop is a keyboard-reachable activation point (tabindex/role/label).
		me.getColumns()[0].setText(
			'<button class="addBtnTop" name="addButton" tabindex="0" role="button" aria-label="' +
			Ext.htmlEncode((Locale.LocaleName && Locale.LocaleName.AddResource) || 'Add Resource') +
			'"></button><span style="margin-left: 10px">' + Ext.htmlEncode(Locale.LocaleName.Name) + '</span>'
		);
		me.tip = new LeankorApp.view.AssignmentToolTip({
				target: me.getSchedulingView().el,
				panel: me
			});
		if (btype !== 'ru') {
			me.getColumns()[0].setText('');
			me.getColumns()[0].initialConfig.header = '';
			me.getColumns()[0].initialConfig.text = '';
		}

		// Grid structural ARIA (roles + aria-row/colindex), kept in sync on change.
		LeankorApp.util.AccessibilityUtil.wireGridAriaIndices(me);
		// Keyboard nav — ↑/↓ rows, Home/End, and ←/→ expand/collapse of tree
		// branches. Bind to the LOCKED grid (the NAME COLUMN), NOT the panel:
		// me.getView() resolves to the scheduling (timeline) view, so binding to
		// the panel routed row focus to the timeline and let the locked grid's own
		// framework nav fire too (focus jumping right + arrows moving two rows). The
		// locked grid view keeps focus and arrow handling in the name column only.
		// We still do NOT call enableBoardFocus (it also wires the normal/timeline
		// grid). Announces each row for screen readers.
		LeankorApp.util.AccessibilityUtil.initGridKeyboardNavigation(me.lockedGrid || me, {
			announceRowFn: function (record, idx, total) {
				var name = '';
				if (record.isSurrogateResource && record.isSurrogateResource()) {
					name = record.getName ? record.getName() : '';
				} else if (record.getOriginalAssignment && record.getOriginalAssignment()) {
					name = record.getOriginalAssignment().get('CustomTaskName') || '';
				} else if (record.get) {
					name = record.get('Name') || '';
				}
				return Ext.String.format(
					(Locale.LocaleName && Locale.LocaleName.RowAnnouncement) || '{0}, row {1} of {2}',
					Ext.htmlEncode(name), idx + 1, total
				);
			}
		});
		// Keyboard-resize the divider between the tree grid and the chart.
		LeankorApp.util.AccessibilityUtil.wireSplitterKeyboard(me);

		// WCAG 2.1.1 Keyboard / 2.4.3 Focus Order — make the utilization
		// timeline keyboard-navigable on the Capacity Planning board. The
		// timeline INTERVAL nodes (.gnt-resource-utilization-interval) become
		// roving tab stops (role/aria-label/tabindex managed by syncPanel ->
		// syncSchedulingView), and bindSchedulingView wires the shared
		// event-navigation handler so:
		//   left grid row  --Tab-->  parallel interval node in the same row
		//   interval node  --Tab-->  timeline horizontal scroller
		//   scroller       --Tab-->  exit the panel
		// (← / → within a row, ↑ / ↓ across rows, Home/End, Esc -> parallel
		// locked-grid row). This is the assignmentgridpanel equivalent of the
		// resource-management board's initTimelineBarNav wiring. We intentionally
		// do NOT call enableBoardFocus here — that would also wire the normal
		// (timeline) grid's row arrow-nav / row focus ring, which must stay off
		// so the focus indicator lives on the individual interval node, not a
		// whole timeline row. bindSchedulingView / syncPanel self-guard against
		// double-binding, so re-renders are safe.
		var a11y = LeankorApp.util.AccessibilityUtil;
		var schedView = (typeof me.getSchedulingView === 'function') ? me.getSchedulingView() : null;
		var schedDom = schedView && schedView.el && schedView.el.dom;
		if (schedView && schedDom) {
			if (Ext.isFunction(a11y.bindSchedulingView) && !schedDom._cpTimelineNavBound) {
				schedDom._cpTimelineNavBound = true;
				a11y.bindSchedulingView(me, schedView);
			}
			var syncTimeline = function () {
				if (Ext.isFunction(a11y.syncPanel)) {
					a11y.syncPanel(me);
				} else if (Ext.isFunction(a11y.neutralizeTimelineTabStops)) {
					a11y.neutralizeTimelineTabStops(schedDom);
				}
			};
			Ext.defer(syncTimeline, 200);
			var st = me.getStore && me.getStore();
			if (st) {
				st.on('refresh', syncTimeline);
				st.on('datachanged', syncTimeline);
			}
			if (typeof schedView.on === 'function') { schedView.on('refresh', syncTimeline); }
		}

		// Tab routing: popOut → + icon → first NAME-COLUMN row → right panel.
		Ext.defer(function () { me.wireAddBtnTabRouting(); }, 50);
	},

	/**
	 * @private
	 * Redirect Name-column-header focus onto the + icon, and wire keydown on the
	 * + icon (Enter/Space activate; Tab routes into the locked grid's first row;
	 * Shift+Tab back to popOut). Lets the user land focus on the NAME COLUMN.
	 */
	wireAddBtnTabRouting: function () {
		var me = this;
		if (btype !== 'ru') { return; }
		var nameCol = me.getColumns()[0];
		var nameColEl = nameCol && nameCol.el && nameCol.el.dom;
		if (!nameColEl) { return; }
		var addBtn = nameColEl.querySelector('.addBtnTop');
		if (!addBtn || addBtn._tabRoutingBound) { return; }
		addBtn._tabRoutingBound = true;

		if (!nameColEl._addBtnFocusRedirected) {
			nameColEl._addBtnFocusRedirected = true;
			nameColEl.addEventListener('focus', function () {
				if (document.activeElement === addBtn) { return; }
				setTimeout(function () {
					addBtn.focus();
					nameCol.el.removeCls('x-column-header-focus');
					nameCol.el.removeCls('x-focus');
				}, 0);
			}, true);
		}

		addBtn.addEventListener('keydown', function (evt) {
			if (!evt) { return; }
			if (evt.keyCode === 13 || evt.keyCode === 32) {
				evt.preventDefault();
				evt.stopPropagation();
				addBtn.click();
				return;
			}
			// Right arrow → focus the vertical splitter (resize divider),
			// matching the RU/RM board. From the splitter, Tab returns to the
			// header's first control (wired in wireSplitterKeyboard).
			if (evt.keyCode === 39) {
				var splitter = me.down && me.down('splitter');
				var splitterDom = splitter && splitter.el && splitter.el.dom;
				if (splitterDom) {
					evt.preventDefault();
					evt.stopPropagation();
					splitterDom.focus();
				}
				return;
			}
			if (evt.keyCode !== 9) { return; }
			if (evt.shiftKey) {
				var popOut = Ext.ComponentQuery.query('[reference=popOut]')[0];
				if (popOut && popOut.el) {
					evt.preventDefault();
					evt.stopPropagation();
					popOut.focus();
				}
				return;
			}
			var view = me.getView();
			var store = view && view.getStore();
			var moved = false;
			if (view && store && store.getCount()) {
				moved = LeankorApp.util.AccessibilityUtil.focusFirstGridRow(me);
			}
			if (!moved) {
				// Blank board (no resource rows): there is nothing meaningful to
				// Tab through (no rows, empty timeline), so send focus straight to
				// the "Skip to main content" link in a single Tab instead of
				// stepping through the empty timeline body. Falls through to the
				// partner panel only when the skip link is absent.
				var skipLink = document.querySelector('.skip-link[data-cp-skip]');
				if (skipLink) {
					skipLink.focus();
					moved = (document.activeElement === skipLink);
				}
				var partner = !moved && Ext.ComponentQuery.query('[xtype=resourceschedule]')[0];
				if (partner && partner.isVisible && partner.isVisible(true)) {
					if (typeof partner.focus === 'function') {
						partner.focus();
						moved = true;
					} else if (partner.getView && partner.getView().el && partner.getView().el.dom) {
						var partnerDom = partner.getView().el.dom;
						if (!partnerDom.hasAttribute('tabindex')) {
							partnerDom.setAttribute('tabindex', '0');
						}
						partnerDom.focus();
						moved = (document.activeElement === partnerDom);
					}
				}
			}
			if (moved) {
				evt.preventDefault();
				evt.stopPropagation();
			}
		}, true);

		var gview = me.getView();
		if (gview && gview.el && gview.el.dom && !gview.el.dom._addBtnShiftTabBound) {
			gview.el.dom._addBtnShiftTabBound = true;
			gview.el.dom.setAttribute('tabindex', '-1');
			gview.el.dom.addEventListener('keydown', function (evt) {
				if (!evt || evt.keyCode !== 9 || !evt.shiftKey) { return; }
				var active = document.activeElement;
				if (!gview.el.dom.contains(active)) { return; }
				var firstRow = gview.el.dom.querySelector('.x-grid-row, .x-grid-item');
				if (active !== gview.el.dom && active !== firstRow && firstRow && !firstRow.contains(active)) {
					return;
				}
				evt.preventDefault();
				evt.stopPropagation();
				addBtn.focus();
			}, true);
		}
	},

	columns: [{
			xtype: 'treecolumn',
			flex: 1,
			resizable: false,
			cls: 'nameColumnCls',
			sortable: false,

			/**@Modified <24-05-18> Pankaj
			 * @Description: Show link icon in UI and on hover show link project name and also remove unnecessary line of code.
			 */
			/**@History
			 *<23-05-18>      <Sheetal Modi>     <If user is inactive , change the color of text to #ddd and show '(inactive)' in postfix of tooltip. otherwise show normally.>
			 */
			renderer: function (v, meta, rec) {
				var iconvalue = '',
				nameToDisplay = '',
				formatString = "{0}[{1}%],",
				assignmentDetail = '',
				projectName = '';
				if (rec.isSurrogateResource()) {
					//If user is inactive , change the color of text to #ddd and show '(inactive)' in postfix of tooltip. otherwise show normally.
					meta.tdAttr = 'title="' + Ext.htmlEncode(rec.getName()) + '"';
					var hoursAvailabilityForResourceType = 0;
					if(rec.getOriginalResource() && rec.getOriginalResource().data.relatedResources){
						hoursAvailabilityForResourceType = portfolio.workingHoursPerDay * rec.getOriginalResource().data.relatedResources.length;
					}
					nameToDisplay = Ext.htmlEncode(rec.getName()) + ' ['+ hoursAvailabilityForResourceType +' '+ Locale.LocaleName.Hours.toLowerCase()+'/'+Ext.htmlEncode(Locale.LocaleName.Day) +']';
					return nameToDisplay;
				} else {
					//var taskData = Ext.getStore('taskStoreCustom').getById(record.get('TaskId'));
					
					resourceStore = resourceStoreType,
					task = rec.getOriginalTask();
					if (rec.getOriginalTask()) {
						if(task.data.assignmentData){
							Ext.Array.forEach(task.data.assignmentData, function(assignment){
								if(assignment.resourceTypeId == rec.getOriginalAssignment().get('ResourceId'))
									assignmentDetail += Ext.String.format(formatString, Ext.htmlEncode(assignment.resourceName), assignment.units);
							});
						}
					}
					if(assignmentDetail.length)
					{
						assignmentDetail = assignmentDetail.substr(0, assignmentDetail.length-1);
					}
					
					if (rec.getOriginalAssignment() && rec.getOriginalAssignment().get('CustomTaskName')) {
						if (rec.getOriginalAssignment().get('isLinked')) {
							iconvalue = '<div role="presentation" class=" x-tree-icon  x-tree-icon-leaf linkIcon"></div> ';
							projectName = ' ('+ Ext.htmlEncode(Locale.LocaleName.LinkedToProject) + ' '+ rec.getOriginalAssignment().get('parentProjectRoomName') + ')';
						}
						meta.tdAttr = 'title="' + Ext.htmlEncode(rec.getOriginalAssignment().get('CustomTaskName')) + '' + Ext.htmlEncode(projectName) + '"';
						nameToDisplay = iconvalue + Ext.htmlEncode(rec.getOriginalAssignment().get('CustomTaskName'));
						// if()
						return nameToDisplay + ' (' + assignmentDetail + ' )';
					}
					return Ext.htmlEncode(rec.getTaskName()) + ' (' + assignmentDetail + ' )';
				}
			}

		}
	],
	// Add some extra functionality
	plugins: [
		// Ext.create("LeankorApp.plugin.DependencyEditor"),
		// @cut-if-gantt->

		{
			ptype: 'gantt_printable',
			pluginId: 'printPlugin',
			fakeBackgroundColor: true,
			exportDialogConfig: {
				showColumnPicker: false,
				// title: 'Print Settings',
				cls: Ext.baseCSSPrefix + 'print-field-cls'
			}
		}
	]

});
