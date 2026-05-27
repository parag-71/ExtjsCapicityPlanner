/*
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: AssignmentChart.js
 */
Ext.define('LeankorApp.view.AssignmentChart', {
    extend       : 'Ext.chart.CartesianChart',
    xtype        : 'assignmentchart',
    height       : 250,
    width        : 430,
	requires 	 : [
		'Ext.chart.theme.Muted',
		'Ext.chart.axis.Numeric',
		'Ext.chart.axis.Category',
		'Ext.chart.series.Bar',
		'Ext.chart.interactions.ItemHighlight'
	],
    theme        : {
        type : 'muted'
    },
    insetPadding : '20 20 20 20',
    interactions : [ 'itemhighlight' ],
    animation    : Ext.isIE8 ? false : {
        easing   : 'backOut',
        duration : 500
    },
    axes         : [
        {
            type           : 'numeric',
            position       : 'left',
            fields         : 'amount',
            minimum        : 0,
            maximum        : 24,
            minorTickSteps : 1,
            majorTickSteps : 6,
            label          : {
                textAlign : 'right'
            },
            title          : Ext.htmlEncode(Locale.LocaleName.Hours),
            grid           : {
                odd  : {
                    fillStyle : 'rgba(255, 255, 255, 0.06)'
                },
                even : {
                    fillStyle : 'rgba(0, 0, 0, 0.03)'
                }
            }
        },
        {
            type     : 'category',
            position : 'bottom',
            fields   : 'name'
        }
    ],
    series       : [ {
        type         : 'bar',
        xField       : 'name',
        yField       : 'amount',
        style        : {
            minGapWidth : 20
        },
        highlightCfg : {
            saturationFactor : 1.5
        },
        label        : {
            field   : 'amount',
            display : 'insideEnd'
        }
    } ],

    afterRender: function () {
        var me = this,
            baseLabel = ((typeof Locale !== 'undefined' && Locale.LocaleName && Locale.LocaleName.Allocation) || 'Allocation') +
                ' ' +
                ((typeof Locale !== 'undefined' && Locale.LocaleName && Locale.LocaleName.ResourceAvailability) || 'resource availability') +
                ' chart';

        me.callParent(arguments);

        if (me.el && me.el.dom) {
            me.el.dom.setAttribute('role', 'img');
            if (!me.el.dom.getAttribute('aria-label')) {
                me.el.dom.setAttribute('aria-label', baseLabel);
            }
        }
    },

    setAriaDescription: function (text) {
        if (!text || !this.el || !this.el.dom) {
            return;
        }
        var clean = String(text).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (clean) {
            this.el.dom.setAttribute('role', 'img');
            this.el.dom.setAttribute('aria-label', clean);
        }
    }
});