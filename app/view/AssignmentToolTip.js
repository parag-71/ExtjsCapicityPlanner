/*
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: AssignmentToolTip.js
 */
Ext.define('LeankorApp.view.AssignmentToolTip', {
    extend: 'Ext.ToolTip',

    requires : [
        'LeankorApp.view.AssignmentChart'
    ],
    delegate : '.gnt-utilizationrow-resource .gnt-resource-utilization-interval',
    showDelay: 0,
    hideDelay: 200,
    anchor   : 'bl',
    layout   : 'fit',

    chartStore: null,
    panel     : null,
    trackMouse: true,
    title     : Ext.htmlEncode(Locale.LocaleName.Hours),

    initComponent: function () {
        this.chartStore = new Ext.data.Store({
            fields: ['name', 'amount']
        });

        Ext.apply(this, {

            items: [
                {
                    xtype       : 'assignmentchart',
                    store       : this.chartStore
                }
            ],

            listeners: {
                beforeshow: this.onMyBeforeShow,
                scope     : this
            }
        });

        this.callParent(arguments);
    },

     onMyBeforeShow: function (tip) {
         var me = this,
            taskStore = LeankorApp.Gantt.gantt.taskStore;
			summaryEvent = me.panel.getSchedulingView().resolveEventRecord(tip.triggerElement),
            originalResource = summaryEvent.getOriginalResource(),
            utilizationDayEl = Ext.fly(tip.triggerElement),
            intervalStart = new Date(parseInt(utilizationDayEl.getAttribute('data-utilization-interval-start'), 10)),
            intervalEnd = new Date(parseInt(utilizationDayEl.getAttribute('data-utilization-interval-end'), 10)),
            utilizationInfo = summaryEvent.getUtilizationInfoForInterval(intervalStart),
            resourceCalendar = originalResource.getCalendar(),
            data = [];

        Ext.Object.each(utilizationInfo.taskInfo, function (taskId, assignmentUtilizationInfo) {
            if (assignmentUtilizationInfo.isUtilized) {
                data.push({
                    name  : taskStore.getNodeById(taskId).getName(),
                    amount: resourceCalendar.convertMSDurationToUnit(assignmentUtilizationInfo.allocationMs, 'h')
                });
            }
        });

        if (data.length === 0) return false;


        //let's get the resource availability value
        var resourceAvailability = 0;

       // loop over its calendar and summarize availability intervals in the "intervalStart - intervalEnd" timespan
        resourceCalendar.forEachAvailabilityInterval(
            {
                startDate: intervalStart,
                endDate  : intervalEnd
            },
            function (start, end) {
                resourceAvailability += end - start;
            }
        );

        //output the resource availability plus over-/underallocated hours
        this.down('cartesian').setTitle(Locale.LocaleName.ResourceAvailability+': ' + resourceCalendar.convertMSDurationToUnit(resourceAvailability, 'h') + ' '+Ext.htmlEncode(Locale.LocaleName.Hrs) +
            (utilizationInfo.isOverallocated || utilizationInfo.isUnderallocated ?
            ', ' + (utilizationInfo.isOverallocated ? Ext.htmlEncode(Locale.LocaleName.Overallocated) : Ext.htmlEncode(Locale.LocaleName.Underallocated)) + ': ' + resourceCalendar.convertMSDurationToUnit(Math.abs(utilizationInfo.allocationMs - resourceAvailability), 'h') + ' '+Ext.htmlEncode(Locale.LocaleName.Hrs)
                : '')
        );
		 this.down('cartesian').axes[0].setTitle(Ext.htmlEncode(Locale.LocaleName.Hours));
		
        var userAvailabilityInfo = 0;
		userAvailabilityInfo = Locale.LocaleName.UserAvailabilityInfo.replace('{UserName}', Ext.htmlEncode(originalResource.getName()));
		userAvailabilityInfo = userAvailabilityInfo.replace('{IntervalStart}', Ext.Date.format(intervalStart, 'M d'));
		userAvailabilityInfo = userAvailabilityInfo.replace('{IntervalEnd}', Ext.Date.format(intervalEnd, 'M d'));
		this.setTitle(userAvailabilityInfo);

        this.chartStore.loadData(data);

        var chart = this.down('cartesian'),
            hrs = (Locale.LocaleName && Locale.LocaleName.Hrs) || 'hrs',
            parts = [];

        Ext.Array.forEach(data, function (row) {
            parts.push(Ext.String.htmlEncode(row.name) + ' ' + row.amount + ' ' + hrs);
        });

        if (chart && Ext.isFunction(chart.setAriaDescription)) {
            chart.setAriaDescription(userAvailabilityInfo + (parts.length ? ': ' + parts.join(', ') : ''));
        }

        if (this.el && this.el.dom) {
            this.el.dom.setAttribute('role', 'tooltip');
            this.el.dom.setAttribute('aria-label', String(userAvailabilityInfo).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
        }
     }
});