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
	ariaLabel: (typeof Locale !== 'undefined' && Locale.LocaleName && Locale.LocaleName.ResourceUtilization) || 'Assignment grid',
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
			me.el.dom.setAttribute('aria-label', me.ariaLabel);
		}
		me.getColumns()[0].setText('<span class ="addBtnTop" name = "addButton"></span><span style = "margin-left : 10px">'+Ext.htmlEncode(Locale.LocaleName.Name)+'</span>');
		me.tip = new LeankorApp.view.AssignmentToolTip({
				target: me.getSchedulingView().el,
				panel: me
			});
		if (btype !== 'ru') {
			me.getColumns()[0].setText('');
			me.getColumns()[0].initialConfig.header = '';
			me.getColumns()[0].initialConfig.text = '';
		}
		LeankorApp.util.AccessibilityUtil.enableBoardFocus(me);

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
