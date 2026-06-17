/*
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: MainViewportController.js
 */
/**
 * This class is the controller for the main view for the application. It is specified as
 * the "controller" of the Main view class.
 */
Ext.define('LeankorApp.view.MainViewportController', {
    extend: 'Ext.app.ViewController',

    alias: 'controller.mainviewport',
    requires: [
        'Ext.plugin.Viewport',
        'Ext.window.MessageBox',
        'Gnt.data.CrudManager',
        'LeankorApp.util.AccessibilityUtil',
        'LeankorApp.view.MainViewportModel',
        'LeankorApp.view.MainViewportController',
        'LeankorApp.view.ResourceSchedule'
    ],
    control: {
        '[reference=shiftPrevious]': {
            click: 'onShiftPrevious'
        },
        '[reference=shiftNext]': {
            click: 'onShiftNext'
        },
        'combo[reference=monthChange]': {
            select: 'onResoulutionChange',
            expand: 'onResoulutionFieldExpand',
            afterrender: 'onResoulutionFieldAfterRender'
        },
        'combo[reference=viewChange]': {
            select: 'onViewChange',
            expand: 'onViewChangeBox',
            afterrender: 'onViewAfterRender'
        },
        'combo[reference=settingCheck]': {
            select: 'onSettingCheck',
        },
        'combo[reference=departmentFilter]': {
            select: 'onDepartmentFilter',
            afterrender: 'onDepartmentAfterRender'

        },
        'combo[reference=projectFilter]': {
            expand: 'onProjectFilter',
            afterrender: 'onProjectAfterRender'
        },
        '[reference=popOut]': {
            click: 'onNewWindow'
        },
        '[reference=searchfilterfield]': {
            keyup: 'onSearchFilter',
            specialkey: 'onSpecialKeyPressFilter'

        },
        '[reference=onAddNewResources]': {
            headerclick: 'onAddNewResources'

        },
        'treecolumn': {
            headerclick: 'onAddNewResources'
        }
    },
    /*
    In constructor we will do stuff for paging.We will use pagingstore for each field(Account & contact , case , opportunity , owner)
    And also will define our custom fields here to be added in card editor.
     */
    constructor: function (config) {
        LeankorApp.util.AccessibilityUtil.applyHeaderPopupMethods(this);
        var pagingStoreOwner = Ext.create('Ext.data.Store', {
            fields: ['Id', 'name', 'SmallPhotoUrl'],
            storeId: 'pagingStoreOwner',
        });
        if (typeof resourceAssignment == 'undefined') {
            Ext.define('resourceAssignment', {
                singleton: true,
                count: 0,
                offset: 0
            });
        }
        this.callParent(arguments);
    },
    /**
     *@method getAllDependentCards
     *@param cardId String
     *@Description method is used to find all cards which are affected due to this card
     */
    init: function () {
        //Following block of code prevent 'scroll to top automatically' when we select any bar on RS first time by scrolling RS view down.
        /*var preventScroll = false;
        Ext.override(Ext.view.Table, {
        focusRow: function (row, delay) {
        preventScroll = true;
        var prev = this.scrollIntoView;
        this.scrollRowIntoView = function () {};
        this.callParent(arguments);
        this.scrollIntoView = prev;
        preventScroll = false;
        }
        });
        Ext.override(Ext.form.field.Base, {
        setValue: function (val) {
        typeof(val) == "string" ? val = Ext.util.Format.htmlDecode(val) : val;
        return this.callParent([val]);
        }
        });
        Ext.override(Ext.dom.Element, {
        focus: function (defer, dom) {
        if (!preventScroll) {
        this.callParent(arguments);
        } else {
        var prev = this.dom.focus;
        this.dom.focus = function () {};
        this.callParent(arguments);
        this.dom.focus = prev;
        }
        }
        }); //end of code
         */

        // Zoom focus-jump fix: at >100% zoom a bare focus() makes the browser
        // scroll the parent Lightning page to bring the element into view, so the
        // board jumps when the "+" resource panel opens. Suppress that scroll only
        // while the panel is open (LeankorApp.suppressFocusScroll is toggled by the
        // panel) so normal keyboard focus still scrolls off-screen components in.
        if (!HTMLElement.prototype.__leankorPreventScrollFocus) {
            var nativeFocus = HTMLElement.prototype.focus;
            HTMLElement.prototype.focus = function (options) {
                if (LeankorApp.suppressFocusScroll && !(options && options.preventScroll !== undefined)) {
                    options = Ext.apply({ preventScroll: true }, options);
                }
                nativeFocus.call(this, options);
            };
            HTMLElement.prototype.__leankorPreventScrollFocus = true;
        }

        var promise = new Promise(function (resolve, reject) {
            portfolio = glueforce.getWorkspaceConfig();
            glueforceUtil.getUserLog(function (resultData) {
                var localeSidKeyData = resultData.LocaleSidKey;
                localeSidKeyData = localeSidKeyData.split('_');
                if (localeSidKeyData.length > 2) {
                    localeSidKeyData.pop();
                }

                var localformat = resultData.LocaleSidKey = localeSidKeyData.join('-'),
                    localformatOrder = glueforceUtil.getStaticLocalData(localformat),
                    formatOrder,
                    formatParts;
                if (localformatOrder) {
                    formatOrder = localformatOrder;
                } else {
                    formatParts = new Intl.DateTimeFormat(localformat);
                    formatParts = formatParts && formatParts.formatToParts();
                    formatOrder = formatParts;
                }
                portfolio.dateMonthFormatOrder = [];
                portfolio.monthYearFormatOrder = [];
                portfolio.dateFormatOrder = [];
                Ext.Array.each(formatOrder, function (format) {
                    switch (format.type || format) {
                        case 'month':
                        case 'm':
                            portfolio.dateFormatOrder.push('m');
                            portfolio.dateMonthFormatOrder.push('m');
                            portfolio.monthYearFormatOrder.push('m');
                            break;
                        case 'day':
                        case 'd':
                            portfolio.dateFormatOrder.push('d');
                            portfolio.dateMonthFormatOrder.push('d');
                            break;
                        case 'year':
                        case 'y':
                            portfolio.dateFormatOrder.push('y');
                            portfolio.monthYearFormatOrder.push('y');
                            break;
                    }
                });
                if (!portfolio.dateFormatOrder.length) {
                    portfolio.dateFormatOrder = ['d', 'm', 'y']; // default Order
                }
                resolve(portfolio);
            });
        });

        promise.then(successMessage => {
            //overrides default presets date formats-start
            var presetsWithdefFormats = Sch.preset.Manager.defaultPresets,
                dateMonthFormatOrder = glueforceUtil.getDateFormat(portfolio.dateMonthFormatOrder[0] + ' ' + portfolio.dateMonthFormatOrder[1], true),
                monthYearFormatOrder = glueforceUtil.getDateFormat(portfolio.monthYearFormatOrder[0] + ' ' + portfolio.monthYearFormatOrder[1], true),
                dateMonthYearFormatOrder = glueforceUtil.getDateFormat(portfolio.dateFormatOrder[0] + ' ' + portfolio.dateFormatOrder[1] + ' ' + portfolio.dateFormatOrder[2], true),
                dateMonthYearFormatOrderSecond = glueforceUtil.getDateFormat(portfolio.dateFormatOrder[0] + '-' + portfolio.dateFormatOrder[1] + '-' + portfolio.dateFormatOrder[2]);

            presetsWithdefFormats.day.headerConfig.middle.dateFormat = "D " + glueforceUtil.getDateFormat(portfolio.dateMonthFormatOrder[0] + '/' + portfolio.dateMonthFormatOrder[1]);
            presetsWithdefFormats.dayAndWeek.displayDateFormat = glueforceUtil.getDateFormat(portfolio.dateFormatOrder[0] + '-' + portfolio.dateFormatOrder[1] + '-' + portfolio.dateFormatOrder[2]) + " G:i";
            presetsWithdefFormats.dayAndWeek.headerConfig.middle.dateFormat = "D " + dateMonthFormatOrder;
            presetsWithdefFormats.hourAndDay.headerConfig.top.dateFormat = "D " + glueforceUtil.getDateFormat(portfolio.dateMonthFormatOrder[0] + '/' + portfolio.dateMonthFormatOrder[1]);
            presetsWithdefFormats.manyYears.displayDateFormat = dateMonthYearFormatOrderSecond;
            presetsWithdefFormats.monthAndYear.displayDateFormat = dateMonthYearFormatOrderSecond;
            presetsWithdefFormats.monthAndYear.headerConfig.middle.dateFormat = monthYearFormatOrder;
            presetsWithdefFormats.weekAndDay.displayDateFormat = dateMonthYearFormatOrderSecond;
            presetsWithdefFormats.weekAndDay.headerConfig.bottom.dateFormat = dateMonthFormatOrder;
            presetsWithdefFormats.weekAndDay.headerConfig.middle.dateFormat = dateMonthYearFormatOrder;
            presetsWithdefFormats.weekAndDayLetter.displayDateFormat = dateMonthYearFormatOrderSecond;
            presetsWithdefFormats.weekAndDayLetter.headerConfig.middle.dateFormat = "D " + dateMonthYearFormatOrder;
            presetsWithdefFormats.weekAndMonth.displayDateFormat = dateMonthYearFormatOrderSecond;
            presetsWithdefFormats.weekAndMonth.headerConfig.middle.dateFormat = glueforceUtil.getDateFormat(portfolio.dateMonthFormatOrder[0] + '/' + portfolio.dateMonthFormatOrder[1]);
            presetsWithdefFormats.weekAndMonth.headerConfig.top.dateFormat = glueforceUtil.getDateFormat(portfolio.dateFormatOrder[0] + '/' + portfolio.dateFormatOrder[1] + '/' + portfolio.dateFormatOrder[2]);
            presetsWithdefFormats.weekDateAndMonth.displayDateFormat = dateMonthYearFormatOrderSecond;
            presetsWithdefFormats.weekDateAndMonth.headerConfig.top.dateFormat = monthYearFormatOrder;
            presetsWithdefFormats.year.displayDateFormat = dateMonthYearFormatOrderSecond;
            //overrides default presets date formats-end

            //override addNewSurrogateAssignments to prevent error 'appendChild of null', while applying filter through search field on header
            Ext.override(Gnt.model.utilization.DefaultUtilizationNegotiationStrategy, {
                addNewSurrogateAssignments: function (utilizationResourceStore, utilizationEventStore, assignmentStore) {
                    var me = this,
                        resourceNode = null,
                        eventsToAdd = [];
                    Ext.Array.forEach(assignmentStore.getRange(), function (assignment) {
                        var surrogateResource,
                            originalResource,
                            originalTask;
                        if (!utilizationResourceStore.getModelByOriginal(assignment)) {
                            originalResource = assignment.getResource();
                            originalTask = assignment.getTask();
                            if (originalResource && originalTask) {
                                //override below line , oiginal was - utilizationResourceStore.getModelByOriginal(originalResource).appendChild(me.makeSurrogateAssignment(assignment));
                                utilizationResourceStore.getModelByOriginal(originalResource) && utilizationResourceStore.getModelByOriginal(originalResource).appendChild(me.makeSurrogateAssignment(assignment));
                                eventsToAdd.push(me.makeSurrogateAssignmentEvent(assignment));
                            }
                        }
                    });
                    utilizationEventStore.add(eventsToAdd);
                }
            });
            //This method (assign) is not supported in some browsers so we need to explicitly  define the method
            if (!Object.assign) {
                Object.defineProperty(Object, 'assign', {
                    enumerable: false,
                    configurable: true,
                    writable: true,
                    value: function (target) {
                        'use strict';
                        if (target === undefined || target === null) {
                            throw new TypeError('Cannot convert first argument to object');
                        }

                        var to = Object(target);
                        for (var i = 1; i < arguments.length; i++) {
                            var nextSource = arguments[i];
                            if (nextSource === undefined || nextSource === null) {
                                continue;
                            }
                            nextSource = Object(nextSource);
                            var keysArray = Object.keys(nextSource);
                            for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
                                var nextKey = keysArray[nextIndex];
                                var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
                                if (desc !== undefined && desc.enumerable) {
                                    to[nextKey] = nextSource[nextKey];
                                }
                            }
                        }
                        return to;
                    }
                });
            }

            //This issue if fixed in bryntum's upgraded version. Issue(Uncaught TypeError: Cannot read property 'isEntity' of null )was occuring when printing a blank board
            /*	Ext.override(Sch.plugin.exporter.AbstractExporter, {
            scrollTo: function (position, callback, scope) {
            var me = this;
            if (me.component.ensureVisible) {
            var record = me.component.store.getAt(position);
            if (record) {
            me.component.ensureVisible(record, {
            callback: function () {
            if (callback && this.isLocked === false) {
            callback.apply(scope || me);
            }
            },
            select: false,
            focus: false,
            animate: false
            });
            } else {
            callback.apply(scope || me);
            }
            } else {
            me.lockedView.bufferedRenderer.scrollTo(position, false, function () {
            me.normalView.bufferedRenderer.scrollTo(position, false, callback, scope || me);
            });
            }
            }
            });*/
            // https://app.assembla.com/spaces/bryntum/tickets/4216
            // #4216 - Gantt doesn't work under FF52 on windows
            /*Ext.override(Sch.patches.EXTJS_23846, {
            extend: 'Sch.util.Patch',
            requires: [
            'Ext.dom.Element',
            'Ext.event.publisher.Gesture'
            ],
            target: [
            'Ext.dom.Element',
            'Ext.event.publisher.Gesture'
            ],
            applyFn: function () {
            if (!(Ext.firefoxVersion >= 52)) {
            return;
            }

            Ext.define('EXTJS_23846.Element', {
            override: 'Ext.dom.Element'
            }, function (Element) {
            var supports = Ext.supports,
            proto = Element.prototype,
            eventMap = proto.eventMap,
            additiveEvents = proto.additiveEvents;
            if (Ext.os.is.Desktop && supports.TouchEvents && !supports.PointerEvents) {
            eventMap.touchstart = 'mousedown';
            eventMap.touchmove = 'mousemove';
            eventMap.touchend = 'mouseup';
            eventMap.touchcancel = 'mouseup';
            additiveEvents.mousedown = 'mousedown';
            additiveEvents.mousemove = 'mousemove';
            additiveEvents.mouseup = 'mouseup';
            additiveEvents.touchstart = 'touchstart';
            additiveEvents.touchmove = 'touchmove';
            additiveEvents.touchend = 'touchend';
            additiveEvents.touchcancel = 'touchcancel';
            additiveEvents.pointerdown = 'mousedown';
            additiveEvents.pointermove = 'mousemove';
            additiveEvents.pointerup = 'mouseup';
            additiveEvents.pointercancel = 'mouseup';
            }
            });
            Ext.define('EXTJS_23846.Gesture', {
            override: 'Ext.event.publisher.Gesture'
            }, function (Gesture) {
            var me = Gesture.instance;
            if (Ext.supports.TouchEvents && !Ext.isWebKit && Ext.os.is.Desktop) {
            me.handledDomEvents.push('mousedown', 'mousemove', 'mouseup');
            me.registerEvents();
            }
            });
            }
            }) */
            // #4257 - Exception thrown when collapsing all tasks in advanced demo
            // Fix for sencha override, required for FF52 on touch devices
            // https://www.sencha.com/forum/showthread.php?310675-Layout-run-failed-with-syncRowHeight-false
            // #4258 - View is dragged when selecting multiple cells
            // Also fixes this issue, reported to sencha
            // https://support.sencha.com/#ticket-36430
            /* Ext.override(Sch.patches.Lockable, {
            extend: 'Sch.util.Patch',
            target: 'Ext.grid.locking.Lockable',
            // minVersion: '6.0.2',
            // maxVersion: '6.0.3',
            applyFn: function () {
            if ((Ext.firefoxVersion >= 52) && Ext.supports.touchScroll === 2) {
            Ext.supports.Touch = 0;
            Ext.supports.TouchEvents = 0;
            Ext.supports.touchScroll = 0;
            }
            }
            }); */
            // Override provided by sencha
            // https://www.sencha.com/forum/showthread.php?310675-Layout-run-failed-with-syncRowHeight-false
            /* Ext.override(Sch.patches.TableLayout, {
            extend: 'Sch.util.Patch',
            requires: 'Sch.patches.Lockable',
            target: 'Ext.view.TableLayout',
            // minVersion: '6.0.2',
            // maxVersion: '6.0.3',
            overrides: {
            calculate: function (ownerContext) {
            var me = this,
            context = ownerContext.context,
            lockingPartnerContext = ownerContext.lockingPartnerContext,
            headerContext = ownerContext.headerContext,
            ownerCtContext = ownerContext.ownerCtContext,
            owner = me.owner,
            columnsChanged = headerContext.getProp('columnsChanged'),
            state = ownerContext.state,
            columnFlusher,
            otherSynchronizer,
            synchronizer,
            rowHeightFlusher,
            bodyDom = owner.body.dom,
            bodyHeight,
            ctSize,
            overflowY,
            normalView,
            lockedViewHorizScrollBar,
            normalViewHorizScrollBar;
            // Shortcut when empty grid - let the base handle it.
            // EXTJS-14844: Even when no data rows (all.getCount() === 0) there may be summary rows to size.
            if (!owner.all.getCount() && (!bodyDom || !owner.body.child('table'))) {
            ownerContext.setProp('viewOverflowY', false);
            me.callParent([
            ownerContext
            ]);
            return;
            }
            if (columnsChanged === undefined) {
            // We cannot proceed when we have rows but no columnWidths determined...
            me.done = false;
            return;
            }
            if (columnsChanged) {
            if (!(columnFlusher = state.columnFlusher)) {
            // Since the columns have changed, we need to write the widths to the DOM.
            // Queue (and possibly replace) a pseudo ContextItem, who's flush method
            // routes back into this class.
            context.queueFlush(state.columnFlusher = columnFlusher = {
            ownerContext: ownerContext,
            columnsChanged: columnsChanged,
            layout: me,
            id: me.columnFlusherId,
            flush: me.flushColumnWidths
            }, true);
            }
            if (!columnFlusher.flushed) {
            // We have queued the columns to be written, but they are still pending, so
            // we cannot proceed.
            me.done = false;
            return;
            }
            }
            // They have to turn row height synchronization on, or there may be variable row heights
            // Either no columns changed, or we have flushed those changes.. which means the
            // column widths in the DOM are correct. Now we can proceed to syncRowHeights (if
            // we are locking) or wrap it up by determining our vertical overflow.
            if (ownerContext.doSyncRowHeights) {
            if (!(rowHeightFlusher = state.rowHeightFlusher)) {
            // When we are locking, both sides need to read their row heights in a read
            // phase (i.e., right now).
            if (!(synchronizer = state.rowHeights)) {
            state.rowHeights = synchronizer = ownerContext.rowHeightSynchronizer;
            me.owner.syncRowHeightMeasure(synchronizer);
            ownerContext.setProp('rowHeights', synchronizer);
            }
            if (!(otherSynchronizer = lockingPartnerContext.getProp('rowHeights'))) {
            me.done = false;
            return;
            }
            // Queue (and possibly replace) a pseudo ContextItem, who's flush method
            // routes back into this class.
            context.queueFlush(state.rowHeightFlusher = rowHeightFlusher = {
            ownerContext: ownerContext,
            synchronizer: synchronizer,
            otherSynchronizer: otherSynchronizer,
            layout: me,
            id: me.rowHeightFlusherId,
            flush: me.flushRowHeights
            }, true);
            }
            if (!rowHeightFlusher.flushed) {
            me.done = false;
            return;
            }
            }
            me.callParent([
            ownerContext
            ]);
            if (!ownerContext.heightModel.shrinkWrap) {
            // If the grid is shrink wrapping, we can't be overflowing
            overflowY = false;
            if (!ownerCtContext.heightModel.shrinkWrap) {
            // We are placed in a fit layout of the gridpanel (our ownerCt), so we need to
            // consult its containerSize when we are not shrink-wrapping to see if our
            // content will overflow vertically.
            ctSize = ownerCtContext.target.layout.getContainerSize(ownerCtContext);
            if (!ctSize.gotHeight) {
            me.done = false;
            return;
            }
            bodyHeight = bodyDom.offsetHeight;
            overflowY = bodyHeight > ctSize.height;
            }
            ownerContext.setProp('viewOverflowY', overflowY);
            }
            // Adjust the presence of X scrollability depending upon whether the headers
            // overflow, and scrollbars take up space.
            // This has two purposes.
            //
            // For lockable assemblies, if there is horizontal overflow in the normal side,
            // The locked side (which shrinkwraps the columns) must be set to overflow: scroll
            // in order that it has acquires a matching horizontal scrollbar.
            //
            // If no locking, then if there is no horizontal overflow, we set overflow-x: hidden
            // This avoids "pantom" scrollbars which are only caused by the presence of another scrollbar.
            if (me.done && Ext.getScrollbarSize().height) {
            if (lockingPartnerContext && owner.isLockedView) {
            normalView = owner.lockingPartner;
            lockedViewHorizScrollBar = owner.scrollFlags.x && ownerContext.headerContext.state.boxPlan.tooNarrow;
            normalViewHorizScrollBar = normalView.scrollFlags.x && lockingPartnerContext.headerContext.state.boxPlan.tooNarrow;
            if (lockedViewHorizScrollBar !== normalViewHorizScrollBar) {
            if (normalViewHorizScrollBar) {
            lockingPartnerContext.setProp('overflowX', true);
            ownerContext.setProp('overflowX', 'scroll');
            } else {
            ownerContext.setProp('overflowX', true);
            lockingPartnerContext.setProp('overflowX', 'scroll');
            }
            } else {
            ownerContext.setProp('overflowX', normalViewHorizScrollBar);
            lockingPartnerContext.setProp('overflowX', lockedViewHorizScrollBar);
            }
            ownerContext.setProp('overflowY', 'scroll');
            }
            // No locking sides, ensure X scrolling is on if there is overflow, but not if there is no overflow
            // This eliminates "phantom" scrollbars which are only caused by other scrollbars
            else if (!owner.isAutoTree) {
            ownerContext.setProp('overflowX', !!ownerContext.headerContext.state.boxPlan.tooNarrow);
            }
            }
            }
            }
            });*/
            //Override it to adjust Milliseconds in YEAR and QUARTER values. those values were using harcoded 24 hours for a day.
            Ext.override(Sch.data.Calendar, {
                constructor: function (config) {
                    config = config || {};
                    var parent = config.parent;
                    delete config.parent;
                    var calendarId = config.calendarId;
                    delete config.calendarId;
                    this.callParent(arguments);
                    this.setParent(parent);
                    this.setCalendarId(calendarId);
                    this.unitsInMs = {
                        MILLI: 1,
                        SECOND: 1000,
                        MINUTE: 60 * 1000,
                        HOUR: 60 * 60 * 1000,
                        DAY: this.hoursPerDay * 60 * 60 * 1000,
                        WEEK: this.daysPerWeek * this.hoursPerDay * 60 * 60 * 1000,
                        MONTH: this.daysPerMonth * this.hoursPerDay * 60 * 60 * 1000,
                        QUARTER: 3 * this.daysPerMonth * this.hoursPerDay * 60 * 60 * 1000,
                        YEAR: 4 * 3 * this.daysPerMonth * this.hoursPerDay * 60 * 60 * 1000
                    };
                    this.defaultWeekAvailability = this.getDefaultWeekAvailability();
                    // traditional "on-demand" caching seems to be not so efficient for calendar (in theory)
                    // calculating any cached property, like, "weekAvailability" or "nonStandardWeeksStartDates" will require full calendar scan each time
                    // so we update ALL cached values on any CRUD operations
                    this.on({
                        // TODO ignore changes of "Name/Cls" field?
                        update: this.clearCache,
                        datachanged: this.clearCache,
                        clear: this.clearCache,
                        scope: this
                    });
                    this.clearCache();
                }
            });

            /** @Deepika Parmar, 28/11/2019, Override it to set Dynamic Date format on tooltip's start and end Date,and this tooltip will opened when we drag item .*/
            Ext.override(Sch.tooltip.Tooltip, {
                constructor: function (config) {
                    var me = this;

                    me.clockTpl = new Sch.tooltip.ClockTemplate();

                    me.startDate = me.endDate = new Date();

                    if (!me.template) {
                        me.template = new Ext.XTemplate([
                            '<div class="' + Ext.baseCSSPrefix + 'fa sch-tip-{[values.valid ? "ok fa-check" : "notok fa-ban"]} ">' +
                            '{[this.renderClock(values.startDate, values.startText, "sch-tooltip-startdate")]}' +
                            '{[this.renderClock(values.endDate, values.endText, "sch-tooltip-enddate")]}' +
                            '<div class="sch-tip-message">{message}</div>' +
                            '</div>', {
                                renderClock: function (date, text, cls) {
                                    var dateFormat = glueforceUtil.getDateFormat(portfolio.dateFormatOrder[0] + '/' + portfolio.dateFormatOrder[1] + '/' + portfolio.dateFormatOrder[2]),
                                        text = Ext.Date.format(new Date(text), dateFormat);
                                    return me.clockTpl.apply({
                                        date: date,
                                        text: text,
                                        cls: cls
                                    });
                                }
                            }
                        ]);
                    }

                    me.callParent(arguments);
                }
            });
            this.initializeGlueforce();
        }, function (errorMessage) { })
    },

    /**
     *@method initializeGlueforce
     *@Description method will initialize glueforce varibale(global) and assign all value to it.And then will call another method to create our main view
     *@History
     *<08-06-18> <Sheetal> Removed Golbal Variable 'GanttPanel'
     */
    initializeGlueforce: function () {
        var me = this;
        portfolio = glueforce.getWorkspaceConfig();
        portfolio.workingHoursPerDay = JSON.parse(portfolio.workingHoursPerDay);

        if (portfolio.saveWorkspaceSnapshot != null) {
            if (portfolio.BaseURL == null || portfolio.BaseURL == '') {
                var onSuccess = function (result) {
                    portfolio.BaseURL = result;
                }
                glueforce.getBaseURL(onSuccess);
            }

            LeankorApp.Gantt = me; // scope global to call updateAllCard @method
            //@ToDO change according new structure later
            LeankorApp.Gantt.gantt = this.gantt = this.createGantt();

            LeankorApp.Gantt.gantt.weekStartDay = portfolio.FirstDayOfTheWeek;
            LeankorApp.Gantt.gantt.highlightWeekends = true;
            var urlData = Ext.urlDecode(Ext.htmlDecode(window.location.search.substring(1)));
            LeankorApp.Gantt.view.items.items[2].setVisible(false);
            if (urlData.bId) { //If true ,then board is opened from Plan Board. In this case we have to load data of that particular board on RM
                var obj = {
                    resourceTypeIds: [],
                    // resourceTypeIds: ['a0n3w00000J0XmdAAF','a0n3w00000J0XmiAAF'],
                    ProjectIds: [urlData.bId],
                    isprojectfilter: true
                    // isprojectfilter: false
                };
                setTimeout(function () {
                    var end = Ext.Date.add(new Date(urlData.end), Ext.Date.DAY, -1);
                    LeankorApp.Gantt.gantt.setViewPreset(urlData.preset, new Date(urlData.start), end);
                    me.getAllResources(obj);
                }, 400);

            } else if (urlData.filteredData) { //If true ,then board is opened from an existing RM which has some filtered applied and we have to show filter this RM with same data
                var isprojectfilter = false,
                    //UserIDs = [],
                    ProjectIds = [],
                    resourceTypeIds = [];
                urlData.roles = urlData.roles && JSON.parse(urlData.roles);
                urlData.projects = urlData.projects && JSON.parse(urlData.projects);
                urlData.resources = urlData.resources && JSON.parse(urlData.resources);
                urlData.bottomVisible = urlData.bottomVisible && JSON.parse(urlData.bottomVisible);
                // if (urlData.roles && urlData.roles.length) {
                // resourceTypeIds = urlData.roles;
                // }
                if (urlData.projects && urlData.projects.length) {
                    isprojectfilter = true;
                    ProjectIds = urlData.projects;
                }
                if (urlData.resources && urlData.resources.length) {
                    resourceTypeIds = urlData.resources;
                }
                var obj = {
                    resourceTypeIds: resourceTypeIds,
                    ProjectIds: ProjectIds,
                    // UserIDs: UserIDs,
                    isprojectfilter: isprojectfilter
                };
                setTimeout(function () {
                    var end = Ext.Date.add(new Date(urlData.end), Ext.Date.DAY, -1);
                    LeankorApp.Gantt.gantt.setViewPreset(urlData.preset, new Date(urlData.start), end);
                    me.getAllResources(obj);
                    if (urlData.bottomVisible) {
                        LeankorApp.Gantt.view.items.items[2].setVisible(true);
                        var comboFld = Ext.ComponentQuery.query('#viewChange')[0];
                        comboFld.config.resourceUtilization = urlData.bottomVisible;
                    }
                }, 400);

            } else {
                LeankorApp.Gantt.gantt.setViewPreset('weekAndMonth');
            }
            glueforce.getValueStreams(function (result) {
                _LOG && console.log('getValueStreams');
                var vsStore = Ext.getStore('vsStore');
                vsStore.proxy.data = result;
                vsStore.load();
                Ext.ComponentQuery.query('#monthChange')[0].setValue('weekAndMonth');

                document.title = Ext.htmlEncode(Locale.LocaleName.CapacityPlanning);

                //LeankorApp.Gantt.view.items.items[2].setVisible(false);

            });

        } else {
            this.initializeGlueforce();
        }
    },

    /**
     *@method createGantt
     *@Description method is used to create gantt board
     */
    createGantt: function () {
        var dateMonthFormatOrder = glueforceUtil.getDateFormat(portfolio.dateMonthFormatOrder[0] + ' ' + portfolio.dateMonthFormatOrder[1], true),
            monthYearFormatOrder = glueforceUtil.getDateFormat(portfolio.monthYearFormatOrder[0] + ' ' + portfolio.monthYearFormatOrder[1], true),
            dateMonthYearFormatOrder = glueforceUtil.getDateFormat(portfolio.dateFormatOrder[0] + ' ' + portfolio.dateFormatOrder[1] + ' ' + portfolio.dateFormatOrder[2], true);

        //view resolution setting for current week (default setting)
        Sch.preset.Manager.registerPreset("weekAndDayNarrow", {
            timeColumnWidth: 35,
            rowHeight: 15, // Only used in horizontal orientation
            resourceColumnWidth: 100, // Only used in vertical orientation
            displayDateFormat: glueforceUtil.getDateFormat(portfolio.dateFormatOrder[0] + '-' + portfolio.dateFormatOrder[1] + '-' + portfolio.dateFormatOrder[2]),
            shiftUnit: "WEEK",
            shiftIncrement: 1,
            defaultSpan: 1, // By default, show 1 week
            timeResolution: {
                unit: "DAY",
                increment: 1
            },
            headerConfig: {
                bottom: {
                    unit: "DAY",
                    increment: 1,
                    dateFormat: 'd',
                    renderer: function (start, end, headerConfig, index) {
                        return Ext.Date.format(start, 'd');
                    }
                },
                middle: {
                    unit: "WEEK",
                    dateFormat: 'D ' + dateMonthFormatOrder,
                    align: 'left'
                }
            }
        });
        //view resolution setting for one week
        Sch.preset.Manager.registerPreset("weekAndHour", {
            timeColumnWidth: 70,
            rowHeight: 15,
            resourceColumnWidth: 100,
            displayDateFormat: glueforceUtil.getDateFormat(portfolio.dateFormatOrder[0] + '-' + portfolio.dateFormatOrder[1] + '-' + portfolio.dateFormatOrder[2]),
            shiftIncrement: 1,
            shiftUnit: 'WEEK',
            defaultSpan: 7,
            timeResolution: {
                unit: 'DAY',
                increment: 1
            },
            headerConfig: {
                middle: {
                    unit: 'DAY',
                    align: 'center',
                    renderer: function (start) {
                        return Ext.Date.dayNames[start.getDay()].substring(0, 1);
                    }
                },
                top: {
                    unit: "WEEK",
                    dateFormat: 'D ' + dateMonthYearFormatOrder
                }
            }
        });
        //view resolution setting for 6 month
        Sch.preset.Manager.registerPreset("weekAndDayLetter", {
            timeColumnWidth: 110,
            rowHeight: 15,
            resourceColumnWidth: 100,
            displayDateFormat: glueforceUtil.getDateFormat(portfolio.dateFormatOrder[0] + '-' + portfolio.dateFormatOrder[1] + '-' + portfolio.dateFormatOrder[2]),
            shiftIncrement: 6,
            shiftUnit: 'MONTH',
            defaultSpan: 6,
            timeResolution: {
                unit: 'DAY',
                increment: 1
            },
            headerConfig: {
                middle: {
                    unit: 'MONTH',
                    align: 'center',
                    dateFormat: monthYearFormatOrder
                },
                top: {
                    unit: 'YEAR',
                    align: 'center',
                    dateFormat: 'Y'
                }
            }
        });

        //view resolution setting for 1 month (4 weeks)
        Sch.preset.Manager.registerPreset("weekAndDayLetter4", {
            timeColumnWidth: 20,
            rowHeight: 15,
            resourceColumnWidth: 100,
            displayDateFormat: glueforceUtil.getDateFormat(portfolio.dateFormatOrder[0] + '-' + portfolio.dateFormatOrder[1] + '-' + portfolio.dateFormatOrder[2]),
            shiftUnit: "MONTH",
            shiftIncrement: 1,
            defaultSpan: 4,
            timeResolution: {
                unit: "DAY",
                increment: 1
            },
            headerConfig: {
                bottom: {
                    unit: "DAY",
                    align: 'center',
                    renderer: function (start) {
                        return Ext.Date.dayNames[start.getDay()].substring(0, 1);
                    }
                },
                middle: {
                    unit: "WEEK",
                    dateFormat: 'D ' + dateMonthYearFormatOrder
                }
            }
        });

        //view resolution setting for 2 month (8 weeks)
        Sch.preset.Manager.registerPreset("weekAndDayLetter8", {
            timeColumnWidth: 20,
            rowHeight: 15,
            resourceColumnWidth: 100,
            displayDateFormat: glueforceUtil.getDateFormat(portfolio.dateFormatOrder[0] + '-' + portfolio.dateFormatOrder[1] + '-' + portfolio.dateFormatOrder[2]),
            shiftUnit: "MONTH",
            shiftIncrement: 2,
            defaultSpan: 8,
            timeResolution: {
                unit: "DAY",
                increment: 1
            },
            headerConfig: {
                bottom: {
                    unit: "DAY",
                    align: 'center',
                    renderer: function (start) {
                        return Ext.Date.dayNames[start.getDay()].substring(0, 1);
                    }
                },
                middle: {
                    unit: "WEEK",
                    dateFormat: 'D ' + dateMonthYearFormatOrder
                }
            }
        });

        //view resolution setting for 3 month (12 weeks)
        Sch.preset.Manager.registerPreset("weekAndDayLetter12", {
            timeColumnWidth: 15,
            rowHeight: 15,
            resourceColumnWidth: 100,
            displayDateFormat: glueforceUtil.getDateFormat(portfolio.dateFormatOrder[0] + '-' + portfolio.dateFormatOrder[1] + '-' + portfolio.dateFormatOrder[2]),
            shiftUnit: "MONTH",
            shiftIncrement: 3,
            defaultSpan: 12,
            timeResolution: {
                unit: "DAY",
                increment: 1
            },
            headerConfig: {
                bottom: {
                    unit: "DAY",
                    align: 'center',
                    renderer: function (start) {
                        return Ext.Date.dayNames[start.getDay()].substring(0, 1);
                    }
                },
                middle: {
                    unit: "WEEK",
                    dateFormat: dateMonthYearFormatOrder
                }
            }
        });
        //view resolution setting for 3 YEARS
        Sch.preset.Manager.registerPreset("monthAndYear3", {
            timeColumnWidth: 20,
            rowHeight: 24,
            resourceColumnWidth: 100,
            displayDateFormat: glueforceUtil.getDateFormat(portfolio.dateFormatOrder[0] + '-' + portfolio.dateFormatOrder[1] + '-' + portfolio.dateFormatOrder[2]),
            shiftUnit: "YEAR",
            shiftIncrement: 3,
            defaultSpan: 36,
            timeResolution: {
                unit: "DAY",
                increment: 1
            },
            headerConfig: {
                middle: {
                    unit: 'MONTH',
                    align: 'center',
                    dateFormat: monthYearFormatOrder
                },
                top: {
                    unit: 'YEAR',
                    align: 'center',
                    dateFormat: 'Y'
                }
            }
        });
        //view resolution setting for 1 YEAR
        Sch.preset.Manager.registerPreset("monthAndYear1", {
            timeColumnWidth: 20,
            rowHeight: 24,
            resourceColumnWidth: 100,
            displayDateFormat: glueforceUtil.getDateFormat(portfolio.dateFormatOrder[0] + '-' + portfolio.dateFormatOrder[1] + '-' + portfolio.dateFormatOrder[2]),
            shiftUnit: "YEAR",
            shiftIncrement: 1,
            defaultSpan: 12,
            timeResolution: {
                unit: "DAY",
                increment: 1
            },
            headerConfig: {
                middle: {
                    unit: 'MONTH',
                    align: 'center',
                    dateFormat: monthYearFormatOrder
                },
                top: {
                    unit: 'YEAR',
                    align: 'center',
                    dateFormat: 'Y'
                }
            }
        });
        //view resolution setting for 2 YEAR
        Sch.preset.Manager.registerPreset("monthAndYear2", {
            timeColumnWidth: 20,
            rowHeight: 24,
            resourceColumnWidth: 100,
            displayDateFormat: glueforceUtil.getDateFormat(portfolio.dateFormatOrder[0] + '-' + portfolio.dateFormatOrder[1] + '-' + portfolio.dateFormatOrder[2]),
            shiftUnit: "YEAR",
            shiftIncrement: 2,
            defaultSpan: 24,
            timeResolution: {
                unit: "DAY",
                increment: 1
            },
            headerConfig: {
                middle: {
                    unit: 'MONTH',
                    align: 'center',
                    dateFormat: monthYearFormatOrder
                },
                top: {
                    unit: 'YEAR',
                    align: 'center',
                    dateFormat: 'Y'
                }
            }
        });
        //Override
        /* Previously , it was returning trimmed name of month names , first 3 letter of month name was getting , but due to Internationalization changes , we are changing it */
        Ext.Date.getShortMonthName = function (month) {
            return Ext.Date.monthNames[month];
        }

        var janMonth = Ext.htmlEncode(Locale.LocaleName.JanuaryLbl),
            FebMonth = Ext.htmlEncode(Locale.LocaleName.FebruaryLbl),
            marchMonth = Ext.htmlEncode(Locale.LocaleName.MarchLbl),
            aprilMonth = Ext.htmlEncode(Locale.LocaleName.AprilLbl),
            mayMonth = Ext.htmlEncode(Locale.LocaleName.MayShort),
            juneMonth = Ext.htmlEncode(Locale.LocaleName.JuneLbl),
            julyMonth = Ext.htmlEncode(Locale.LocaleName.JulyLbl),
            augMonth = Ext.htmlEncode(Locale.LocaleName.AugustLbl),
            sepMonth = Ext.htmlEncode(Locale.LocaleName.SeptemberLbl),
            octMonth = Ext.htmlEncode(Locale.LocaleName.OctoberLbl),
            novMonth = Ext.htmlEncode(Locale.LocaleName.NovemberLbl),
            decMonth = Ext.htmlEncode(Locale.LocaleName.DecemberLbl);

        Ext.Date.monthNames = [janMonth, FebMonth, marchMonth, aprilMonth, mayMonth, juneMonth, julyMonth, augMonth, sepMonth, octMonth, novMonth, decMonth];
        Ext.Date.monthNamesInEnglish = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        Ext.Date.monthNumbers = {
            janMonth: 0,
            FebMonth: 1,
            marchMonth: 2,
            aprilMonth: 3,
            mayMonth: 4,
            juneMonth: 5,
            julyMonth: 6,
            augMonth: 7,
            sepMonth: 8,
            octMonth: 9,
            novMonth: 10,
            decMonth: 11
        };
        Ext.Date.getMonthNumber = function (name) {
            return Ext.Date.monthNumbers[name];
        },
            Ext.override(Ext.picker.Month, {
                okText: Ext.htmlEncode(Locale.LocaleName.OK),
                cancelText: Ext.htmlEncode(Locale.LocaleName.Cancel)
            });
        Ext.Date.dayNames = [
            Ext.htmlEncode(Locale.LocaleName.Sunday),
            Ext.htmlEncode(Locale.LocaleName.Monday),
            Ext.htmlEncode(Locale.LocaleName.Tuesday),
            Ext.htmlEncode(Locale.LocaleName.Wednesday),
            Ext.htmlEncode(Locale.LocaleName.Thursday),
            Ext.htmlEncode(Locale.LocaleName.Friday),
            Ext.htmlEncode(Locale.LocaleName.Saturday)
        ];
        Ext.define('LeankorApp.model.CalendarDay', {
            override: 'Sch.model.CalendarDay',
            verifyAvailability: function (intervals) {
                var me = this;
                intervals.sort(function (a, b) {
                    return a.startTime - b.startTime;
                });
                Ext.Array.each(intervals, function (interval, i) {
                    if (interval.startTime > interval.endTime) {
                        throw new Error("Start time " + Ext.Date.format(interval.startTime, 'H:i') + " is greater than end time " + Ext.Date.format(interval.endTime, 'H:i'));
                    }
                    /*if (i > 0 && intervals[i - 1].endTime > interval.startTime) {
                    throw new Error("Availability intervals should not intersect: [" + me.stringifyInterval(intervals[i - 1]) + "] and [" + me.stringifyInterval(interval) + "]");
                    }*/
                });
            },
        });

        var taskStore = Ext.getStore('taskStoreCustom'),
            assignmentStore = Ext.getStore('assignmentStore');
        var cm = Ext.create('Gnt.data.CrudManager', {
            taskStore: taskStore
        }),
            gantt = btype == 'ru' ? Ext.ComponentQuery.query('[xtype=assignmentgridpanel]')[0] : Ext.ComponentQuery.query('[xtype=resourceschedule]')[0];
        if (btype != 'ru') {
            gantt.eventStore = gantt.taskStore = taskStore;
            gantt.resourceStore = taskStore.resourceStore;
            gantt.assignmentStore = assignmentStore;
        }

        return gantt;
    },

    /**
     *@method onShiftPrevious
     *@Description Shift the view preset of gantt to previous according to default view settings
     */
    onShiftPrevious: function () {
        LeankorApp.Gantt.gantt.shiftPrevious();
        var me = this;
        typeof me.objFilter != 'undefined' && me.getAllResources(me.objFilter);
    },

    /**
     *@method onShiftNext
     *@Description Shift the view preset of gantt to next according to default view settings
     */
    onShiftNext: function () {
        LeankorApp.Gantt.gantt.shiftNext();
        var me = this;
        typeof me.objFilter != 'undefined' && me.getAllResources(me.objFilter);
    },

    /**
     *@method onHighlightCriticalPath
     *@param flagForCritical boolean
     *@Description method is used to highlightCriticalPaths if flagForCritical id true and if not then will unhighlightCriticalPaths
     */
    onHighlightCriticalPath: function (flagForCritical) {
        var view = LeankorApp.Gantt.gantt.getSchedulingView();
        if (flagForCritical) {
            view.highlightCriticalPaths(true);
        } else {
            view.unhighlightCriticalPaths(true);
        }
        view.refreshKeepingScroll();

    },

    /**
     *@method onNewWindow
     *@Description method is used to open current view into new tab
     */
    onNewWindow: function () {
        var fid = Ext.urlDecode(Ext.htmlDecode(window.location.search.substring(1))).fid,
            url = portfolio.BaseURL;
        var myURL,
            me = this,
            isVisible = false,
            partnerView = btype != 'ru' ? Ext.ComponentQuery.query('[xtype=assignmentgridpanel]')[0] : Ext.ComponentQuery.query('[xtype=resourceschedule]')[0];
        if (partnerView && !partnerView.hidden) { // If already opened
            isVisible = true;
        }

        myURL = url + portfolio.capacityPlanningURL.replace('/', '') + '?btype=ru';
        if (typeof (LeankorApp.Gantt.objFilter) != 'undefined') {
            myURL = myURL + '&filteredData=true' + '&preset=' + LeankorApp.Gantt.gantt.getViewPreset() + '&start=' + LeankorApp.Gantt.gantt.getStartDate().toISOString() + '&end=' + LeankorApp.Gantt.gantt.getEndDate().toISOString() + '&bottomVisible=' + isVisible;
            if (LeankorApp.Gantt.objFilter.ProjectIds.length) {
                myURL = myURL + '&projects=' + JSON.stringify(LeankorApp.Gantt.objFilter.ProjectIds);
            }
            // if (LeankorApp.Gantt.objFilter.UserIDs.length) {
            // myURL = myURL + '&users=' + JSON.stringify(LeankorApp.Gantt.objFilter.resourceTypeIds);
            // }
            if (LeankorApp.Gantt.objFilter.resourceTypeIds.length) {
                myURL = myURL + '&resources=' + JSON.stringify(LeankorApp.Gantt.objFilter.resourceTypeIds);
            }
        }
        me.confirmMsgBox(Locale.LocaleName.OpenInNewTabConfirmation, function (btn) {
            if (btn === 'yes') {
                window.open(me.sanitizeValue(myURL), '_blank');
            }
        });
    },

    /**
     *@method onResoulutionChange
     *@param combo ComboBox
     *@param records store records
     *@param eOpts method list
     *@Description method is used to change the current resolution of gantt panel
     */
    onResoulutionChange: function (combo, records, eOpts) {
        _LOG && console.log('on resolution change');
        var radio = document.getElementsByClassName(records.data.value),
            me = this;
        radio[0].checked = true;
        var start = LeankorApp.Gantt.gantt.taskStore.getTotalTimeSpan().start ? LeankorApp.Gantt.gantt.taskStore.getTotalTimeSpan().start : LeankorApp.Gantt.gantt.getStart();
        LeankorApp.Gantt.gantt.switchViewPreset(combo.getValue(), start);
        typeof me.objFilter != 'undefined' && me.getAllResources(me.objFilter);
    },

    /**
     *@method onResoulutionFieldExpand
     *@param e event
     *@Description this method call when we expand resolution dropdown. We will check the combobox field value becuase it's workinh like a checkbox
     */
    onResoulutionFieldExpand: function (e) {
        _LOG && console.log('on resolution blur');
        if (e.value) {
            var radio = document.getElementsByClassName(e.value);
            radio[0].checked = true;
        }
    },

    /**
     *@method onViewChange
     *@param combo ComboBox
     *@param records store records
     *@param eOpts method list
     *@Description method is used to change main view
     */
    onViewChange: function (combo, records, eOpts) {
        _LOG && console.log('on view change');
        var partnerView = null,
            assignmentPanel = Ext.ComponentQuery.query('[xtype=assignmentgridpanel]')[0];
        if (btype != 'ru') {
            partnerView = assignmentPanel;
            if (partnerView && !partnerView.hidden) { // If already opened
                partnerView.setVisible(false);
            } else if (partnerView && partnerView.hidden) {
                partnerView.setVisible(true);
            }
            combo.config.resourceUtilization = !combo.config.resourceUtilization;
        } else {
            partnerView = Ext.ComponentQuery.query('[xtype=resourceschedule]')[0];
            if (partnerView && !partnerView.hidden) { // If already opened
                partnerView.setVisible(false);
            } else if (partnerView && partnerView.hidden) {
                partnerView.setVisible(true);
            }
            combo.config.resourceUtilization = !combo.config.resourceUtilization;
        }
        if (!partnerView) {
            partnerView = this.partnerView = this.getPartnerPanel();
            partnerView.setVisible(true);
        }
        partnerView.refreshViews();
        combo.reset();
        Ext.defer(function () {
            assignmentPanel.getStore().sort('Name', 'ASC');
        }, 500);
    },
    /** @author BM to pick resource option
     *
     */
    onViewChangeBox: function (fld, eOpt) {
        _LOG && console.log('onViewChangeBox');
        store = fld.getStore();
        store.removeAll();
        if (btype != 'ru') {
            store.proxy.data = [{
                "name": Ext.htmlEncode(Locale.LocaleName.CapacityPlanning),
                "value": fld.config.resourceUtilization == true ? 'checked' : 'unchecked',
                "id": 'resourceutilization'
            }
            ];
            // taskStore.load();
        } else {
            store.proxy.data = [{
                "name": Ext.htmlEncode(Locale.LocaleName.ResourceSchedule),
                "value": fld.config.resourceUtilization == true ? 'checked' : 'unchecked',
                "id": 'resourceschedule'
            }
            ];
        }
        store.load();

    },
    /**
     *@method onSearchFilter
     *@param field TextField
     *@param e event
     *@Description on serch field if any key is pressed then call applyFilters
     */
    onSearchFilter: function (field, e) {
        _LOG && console.log('on onSearchFilter');
        this.applyFilters();
    },

    /**
     *@method onSpecialKeyPressFilter
     *@param field TextField
     *@param e event
     *@Description on serch field if escape key is pressed then clear filter otherwise call applyFilters
     */
    onSpecialKeyPressFilter: function (field, e) {
        var me = this;
        if (e.getKey() === e.ESC) {
            field.reset();
            LeankorApp.Gantt.gantt.taskStore.clearTreeFilter();
        } else {
            me.applyFilters();
        }
    },

    /**
     *@method onSettingCheck
     *@param combo ComboBox
     *@param records records of store attached with combo
     *@param eOpts Method List for this combobox
     *@Description method is used to perform any action according to option selected from setting combobox
     */
    onSettingCheck: function (combo, records, eOpts) {
        _LOG && console.log('on setting change');
        var ganttPanel = LeankorApp.Gantt.gantt,
            meMain = this,
            value = combo.getValue();
        switch (value) {
            case "Zoom to Fit":
                ganttPanel.zoomToFit(); //call ZoomToFit  method to bring all events on a visible view
                var me = this;
                typeof me.objFilter != 'undefined' && me.getAllResources(me.objFilter);
                combo.reset();
                break;
            case "Print": // Call print function and also set default options for print dialogue box
                ganttPanel.getPlugin('printPlugin').exportDialogConfig.dateRangeFormat = glueforceUtil.getDateFormat(portfolio.dateFormatOrder[0] + '/' + portfolio.dateFormatOrder[1] + '/' + portfolio.dateFormatOrder[2]);
                ganttPanel.getPlugin('printPlugin').exportDialogConfig.title = Locale.LocaleName.PrintSetting;
                ganttPanel.print();
                var pluginPrint = ganttPanel.getPlugin('printPlugin'),
                    activeDialogue = pluginPrint.getActiveExportDialog();
                activeDialogue.down('#export').setText(Locale.LocaleName.Print);
                activeDialogue.down('#export').setTooltip(Locale.LocaleName.Print);
                activeDialogue.down('#cancel').setText(Locale.LocaleName.Cancel);
                activeDialogue.down('#cancel').setTooltip(Locale.LocaleName.Cancel);
                activeDialogue.tools['close'].setTooltip(Locale.LocaleName.CloseDialog);
                LeankorApp.util.AccessibilityUtil.initCloseToolAccessibility(activeDialogue);
                Ext.defer(function () {
                    var first = activeDialogue.form && activeDialogue.form.items &&
                        activeDialogue.form.items.items && activeDialogue.form.items.items[0];
                    if (first && typeof first.focus === 'function') {
                        first.focus();
                    }
                }, 50);
                Ext.Array.forEach(activeDialogue.form.items.items, function (item, index) {
                    var field = item.name;
                    // a11y: tag combo picker so SCSS can draw a keyboard-focus border
                    // on the currently navigated item. Picker is created lazily, so
                    // attach on first expand. Skips non-combo fields (DPI, showHeader).
                    if (item.getPicker) {
                        item.on('expand', function (cmp) {
                            var picker = cmp.getPicker();
                            if (picker && !picker.hasCls('lk-print-combo-list')) {
                                picker.addCls('lk-print-combo-list');
                            }
                        }, item, { single: true });
                    }
                    switch (field) {
                        case "range":

                            item.setFieldLabel(Locale.LocaleName.ScheduleRange);
                            item.store.setData([{
                                "name": Locale.LocaleName.CompleteSchedule,
                                "value": "complete"
                            }, {
                                "name": Locale.LocaleName.CompleteScheduleForAll,
                                "value": "completedata"
                            }, {
                                "name": Locale.LocaleName.DateRange,
                                "value": "date"
                            }, {
                                "name": Locale.LocaleName.VisibleSchedule,
                                "value": "current"
                            }
                            ]);
                            item.setValue('complete');
                            break;
                        case "rowsRange":

                            item.setFieldLabel(Locale.LocaleName.RowsRange);
                            item.store.setData([{
                                "name": Locale.LocaleName.AllRows,
                                "value": "all"
                            }, {
                                "name": Locale.LocaleName.VisibleRows,
                                "value": "visible"
                            }
                            ]);
                            item.setValue('all');
                            break;
                        case "id":

                            item.setFieldLabel(Locale.LocaleName.ControlPagination);
                            item.store.setData([{
                                "name": Locale.LocaleName.SinglePage,
                                "value": "singlepage"
                            }, {
                                "name": Locale.LocaleName.MultiplePages,
                                "value": "multipage"
                            }, {
                                "name": Locale.LocaleName.MultiplePagesVertically,
                                "value": "multipagevertical"
                            }
                            ]);
                            item.setValue('multipage');
                            break;
                        case "format":
                            formatStore = Ext.create('Ext.data.Store', {
                                fields: ['name', 'field1'],
                                storeId: 'formatStore',
                                data: [{
                                    "name": Locale.LocaleName.A5,
                                    "field1": "A5"
                                }, {
                                    "name": Locale.LocaleName.A4,
                                    "field1": "A4"
                                }, {
                                    "name": Locale.LocaleName.Letter,
                                    "field1": "Letter"
                                }, {
                                    "name": Locale.LocaleName.Legal,
                                    "field1": "Legal"
                                }, {
                                    "name": Locale.LocaleName.A3,
                                    "field1": "A3"
                                }
                                ]
                            }),
                                item.setFieldLabel(Locale.LocaleName.PaperFormat);
                            item.setStore('formatStore');
                            item.setConfig('displayField', 'name');
                            item.setValue('Letter');
                            break;
                        case "orientation":

                            item.setFieldLabel(Locale.LocaleName.Orientation);
                            item.store.setData([{
                                "name": Locale.LocaleName.Portrait,
                                "value": "portrait"
                            }, {
                                "name": Locale.LocaleName.Landscape,
                                "value": "landscape"
                            }
                            ]);
                            item.setValue('landscape');
                            break;
                        case "DPI":
                            item.setValue(200);
                            item.setFieldLabel(Locale.LocaleName.DPI);
                            break;
                        case "showHeader":
                            item.setValue(true);
                            item.setFieldLabel(Locale.LocaleName.ShowHeader);
                            break;
                        default:
                            break;
                    }
                });
                var btn = activeDialogue.query('button'),
                    i = 0,
                    printbutton,
                    btnToolbar;
                for (i; i < btn.length; i++) {
                    printbutton = btn[i];
                    printbutton.getItemId() == 'export' ? printbutton.addCls('saveBtnClss') : printbutton.addCls('cancelBtnClss');
                    // The footer button bar is an ExtJS FocusableContainer: it keeps a
                    // roving tabindex (only one button is tabbable, Left/Right arrows
                    // move between them), so Tab reached Save but skipped Cancel. Opt
                    // the toolbar out of that roving behaviour and give every button
                    // tabindex 0 so Tab visits them in the same sequence (Save -> Cancel).
                    btnToolbar = printbutton.ownerCt;
                    if (btnToolbar && btnToolbar.focusableContainer) {
                        btnToolbar.focusableContainer = false;
                        if (Ext.isFunction(btnToolbar.activateFocusableContainer)) {
                            btnToolbar.activateFocusableContainer(false);
                        }
                    }
                    printbutton.focusable = true;
                    if (Ext.isFunction(printbutton.setTabIndex)) {
                        printbutton.setTabIndex(0);
                    } else if (printbutton.el && printbutton.el.dom) {
                        printbutton.el.dom.setAttribute('tabindex', '0');
                    }
                }
                combo.reset();
                break;
            case "Today":
                ganttPanel.scrollToDate(Ext.Date.add(new Date(), Ext.Date.DAY, -4), true); // Scroll view to current date
                var me = this;
                typeof me.objFilter != 'undefined' && me.getAllResources(me.objFilter);
                combo.reset();
                break;

            default:
                break;
        }
    },
    toggleProjectFilterFolder: function (popup, record) {
        var me = this,
            port;

        if (record.isExpanded && record.isExpanded()) {
            record.collapse();
            return;
        }

        if (record.data && record.data.isTapped) {
            record.expand();
            return;
        }

        port = {
            id: record.data.Id,
            navigationVerb: 'ResourceManagementView'
        };
        popup.setLoading(Ext.htmlEncode(Locale.LocaleName.Loading) + '...');
        glueforce.getPortfolioHierarchy_List(port, function (result) {
            if (result.length) {
                record.appendChild(result);
            }
            record.expand();
            popup.setLoading(false);
            me.syncResourceTypePopupAccessibility(
                popup,
                popup.leankorResourceTypeAccessibilityConfig || {});
        });
        record.data.isTapped = true;
    },
    applyRoleHierarchyFilter: function (record, popup) {
        var meMain = this,
            idList = [],
            subordinateRoles;

        if (!record) {
            return;
        }

        subordinateRoles = record.data.SubordinateRoles || [];

        function addRoleIds(rec) {
            Ext.Array.forEach(rec.SubordinateRoles || [], addRoleIds);
            idList.push(rec.RoleId);
        }

        Ext.Array.forEach(subordinateRoles, addRoleIds);
        idList.push(record.data.RoleId);

        if (idList.length) {
            meMain.getAllResources({
                resourceTypeIds: idList,
                ProjectIds: [],
                UserIDs: [],
                isprojectfilter: false
            });
        }

        popup.close();
    },
    getPartnerPanel: function () {

        var gantt = LeankorApp.Gantt.gantt,
            taskStore = Ext.getStore('taskStoreCustom'),
            assignmentStore = Ext.getStore('assignmentStore'),
            partnerPanel = (btype == 'ru' ? Ext.ComponentQuery.query('[xtype=assignmentgridpanel]')[0] : Ext.ComponentQuery.query('[xtype=resourceschedule]')[0]),
            configForRS = configForRU = null;
        if (btype == 'ru') {
            configForRS = {
                resourceStore: taskStore.resourceStore,
                eventStore: taskStore,
                assignmentStore: assignmentStore,
                region: 'south',
                height: '50%',
                partnerTimelinePanel: partnerPanel,
                // Share non-working time visualization
                calendar: taskStore.getCalendar(),

            };
        } else {
            configForRU = {
                taskStore: taskStore,
                partnerTimelinePanel: partnerPanel,
                region: 'south',
                height: '50%',
                // Share non-working time visualization
                calendar: taskStore.getCalendar(),

            };
        }
        this.partnerView = (btype == 'ru' ? new LeankorApp.view.ResourceSchedule(configForRS) : new LeankorApp.view.AssignmentGrid(configForRU));
        LeankorApp.Gantt.view.add(this.partnerView);
        gantt.on('zoomchange', function () {
            this.partnerView.normalGrid.scrollTask.cancel();
        }, this);

        return this.partnerView;
    },
    /**
     *@method onProjectFilter
     *@param combo ComboBox
     *@param records records of store attached with combo
     *@param eOpts Method List for this combobox
     *@Description method is used to perform any action according to option selected from setting combobox
     */
    onProjectFilter: function (combo, records, eOpts) {
        // var me = this,
        var storeTree = Ext.getStore('folderProjectTree'),
            me = this;
        storeTree.removeAll();

        var popup = Ext.create('Ext.tree.Panel', {
            width: 280,
            title: Ext.htmlEncode(Locale.LocaleName.Projects),
            height: 450,
            store: 'folderProjectTree',
            closable: true,
            closeToolText: Ext.htmlEncode(Locale.LocaleName.CloseDialog),
            floating: true,
            modal: true,
            itemId: 'projectListGrid',
            mode: 'MULTI',
            multiSelect: true,
            // loader : true,
            rootVisible: false,
            useArrows: true,
            displayField: 'Name',
            allowDeselect: true,
            cls: 'mycustomTree',
            draggable: true,
            constrain: true,
            dockedItems: [{
                xtype: 'toolbar',
                flex: 1,
                dock: 'bottom',
                ui: 'footer',
                layout: {
                    pack: 'end',
                    type: 'hbox'
                },
                items: [{
                    xtype: 'button',
                    text: Ext.htmlEncode(Locale.LocaleName.Reset),
                    tooltip: Ext.htmlEncode(Locale.LocaleName.Reset),
                    cls: 'deleteCardBtn',
                    handler: function () {
                        var selectionModel = popup.getSelectionModel();
                        if (selectionModel) {
                            selectionModel.deselectAll();
                        }
                    }
                }, {
                    xtype: 'button',
                    text: Ext.htmlEncode(Locale.LocaleName.Filter),
                    tooltip: Ext.htmlEncode(Locale.LocaleName.Filter),
                    itemId: 'projectFilterButton',
                    cls: 'editPopUpSaveBtn',
                    handler: function () {
                        var idList = [],
                            mee = this,
                            cmp = this.up('panel').getSelectionModel();
                        cmp.selected.each(function (task) {
                            if (idList.indexOf(task.data.Id) === -1 && task.isLeaf()) {
                                idList.push(task.data.Id);
                            }
                        });
                        if (idList.length) {
                            var obj = {
                                resourceTypeIds: [],
                                ProjectIds: idList,
                                UserIDs: [],
                                isprojectfilter: true
                            };
                            me.getAllResources(obj);

                        }
                        popup.close();
                    }
                }
                ]
            }
            ],
            listeners: {
                beforecellclick: function (table, td, cellIndex, record, tr, rowIndex, e, eOpts) {
                    if (!e.parentEvent && e.target) {
                        e.parentEvent = e;
                    }
                    if (!record.data.isTapped && !record.isLeaf()) {
                        var port = {
                            id: record.data.Id,
                            navigationVerb: "ResourceManagementView"
                        };
                        popup.setLoading(Ext.htmlEncode(Locale.LocaleName.Loading) + '...');
                        glueforce.getPortfolioHierarchy_List(port, function (result) {
                            if (result.length) {
                                record.appendChild(result);
                                record.expand();
                            }
                            popup.setLoading(false);
                        });
                    }
                    record.data.isTapped = true;
                },
                cellclick: function (table, td, cellIndex, record, tr, rowIndex, e, eOpts) {
                    if (!e.parentEvent && e.target) {
                        e.parentEvent = e;
                    }
                    if (e.parentEvent) {
                        var targetEl = Ext.get(e.parentEvent.target);
                        if (targetEl && targetEl.hasCls('x-tree-icon-parent')) {
                            record.expand();

                        } else if (targetEl && targetEl.hasCls('x-tree-icon-parent-expanded')) {
                            record.collapse();

                        }

                    }
                },
                beforeclose: function () {
                    storeTree.getProxy().setData([]);
                    storeTree.removeAll();
                    storeTree.clearData();
                }
            }
        });
        LeankorApp.util.AccessibilityUtil.decoratePopup(popup);
        LeankorApp.util.AccessibilityUtil.wireTreePopupAria(popup);
        popup.showBy(combo, 'tc-bc?');
        LeankorApp.util.AccessibilityUtil.initPopupKeyboardNav(popup, combo);
        LeankorApp.util.AccessibilityUtil.wireTreeKeyboardNav(popup, {
            enterTogglesFolder: true,
            beforeExpand: function (rec, doExpand) {
                if (!rec.data.isTapped) {
                    rec.data.isTapped = true;
                    var port = {
                        id: rec.data.Id,
                        navigationVerb: 'ResourceManagementView'
                    };
                    popup.setLoading(Ext.htmlEncode(Locale.LocaleName.Loading) + '...');
                    glueforce.getPortfolioHierarchy_List(port, function (result) {
                        if (result.length) {
                            rec.appendChild(result);
                        }
                        popup.setLoading(false);
                        doExpand();
                    });
                } else {
                    doExpand();
                }
            }
        });
        popup.setLoading(Ext.htmlEncode(Locale.LocaleName.Loading) + '...');
        glueforce.getallParentFolder(function (result) {
            var dis = this;
            if (result.length) {
                //@Author Hitesh following used for XSS
                dis.dorec = function (folder, index) {
                    if (Array.isArray(folder.ChildRecords)) {
                        folder.ChildRecords.forEach(dis.dorec);
                    }
                    folder.Name = Ext.htmlEncode(folder.Name);
                }
                Ext.Array.forEach(result, dis.dorec); //eof code
                storeTree.getProxy().setData(result);
                storeTree.load();
                popup.setLoading(false);
            }
        }); //eof code.
        combo.reset();

    },
    /**
     *@method onDepartmentFilter
     *@param combo ComboBox
     *@param records records of store attached with combo
     *@param eOpts Method List for this combobox
     *@Description method is used to perform any action according to option selected from setting combobox
     */
  onDepartmentFilter: function (combo, records, eOpts) {
    _LOG && console.log('onDepartmentFilter');

    var ganttPanel = LeankorApp.Gantt.gantt,
        meMain = this,
        value = combo.getValue();

    switch (value) {
        case "By Resource Types":
            resourceAssignment.count = 0;
            resourceAssignment.offset = 0;
            Ext.getStore('pagingStoreOwner').removeAll();

            var idList = [],
                recordList = [],
                isClosingDepartmentPopup = false,

                clearDepartmentPopup = function (popupCmp) {
                    popupCmp = popupCmp || this;

                    if (isClosingDepartmentPopup) {
                        return;
                    }

                    isClosingDepartmentPopup = true;

                    if (meMain.popup === popupCmp) {
                        meMain.popup = null;
                    }

                    if (combo && !combo.destroyed) {
                        combo.reset();
                    }
                },

                makeCloseToolFocusable = function (popup) {
    Ext.defer(function () {
        var closeToolCmp,
            closeToolEl,
            closeToolImg;

        if (!popup || popup.destroyed || !popup.el) {
            return;
        }

        closeToolCmp = popup.down('tool[type=close]');
        closeToolEl = closeToolCmp && closeToolCmp.el;
        closeToolImg = closeToolEl && closeToolEl.down('.x-tool-img');

        if (closeToolEl && closeToolEl.dom) {
            closeToolEl.dom.setAttribute('tabindex', '0');
            closeToolEl.dom.setAttribute('role', 'button');
            closeToolEl.dom.setAttribute('aria-label', Ext.htmlEncode(Locale.LocaleName.CloseDialog));
        }

        if (closeToolImg && closeToolImg.dom) {
            closeToolImg.dom.setAttribute('tabindex', '0');
            closeToolImg.dom.setAttribute('role', 'button');
            closeToolImg.dom.setAttribute('aria-label', Ext.htmlEncode(Locale.LocaleName.CloseDialog));
        }
    }, 100);
};
                bindCloseToolKeyboard = function (popup) {
                    var keyHandler;

                    if (!popup || popup._resourceCloseToolKeyBound) {
                        return;
                    }

                    popup._resourceCloseToolKeyBound = true;

                   keyHandler = function (e) {
    var key = e.keyCode || e.which,
        activeEl = document.activeElement,
        closeToolEl,
        closeToolCmp,
        activeCloseTool;

    if (!popup || popup.destroyed || popup.destroying || !popup.el) {
        return;
    }

    closeToolCmp = popup.down('tool[type=close]');
    closeToolEl = closeToolCmp && closeToolCmp.el;

    activeCloseTool = false;

    if (closeToolEl && closeToolEl.dom && activeEl) {
        var headerCmp = (closeToolCmp && closeToolCmp.ownerCt) ||
                (popup.getHeader && popup.getHeader()),
            headerDom = headerCmp && headerCmp.el && headerCmp.el.dom;

        activeCloseTool =
            closeToolEl.dom === activeEl ||
            closeToolEl.dom.contains(activeEl) ||
            !!Ext.fly(activeEl).up('.x-tool-close', popup.el, true) ||
            !!Ext.fly(activeEl).up('.x-tool', popup.el, true) ||
            // First-focus case: the header is a FocusableContainer, so DOM focus
            // can sit on the header itself (the X only becomes activeElement after
            // tabbing). The header has nothing actionable except the close tool, so
            // Enter/Space while focus is anywhere in it closes the popup.
            !!(headerDom && (headerDom === activeEl || headerDom.contains(activeEl)));
    }

    if (key === 27) {
        e.preventDefault();
        e.stopPropagation();
        popup.close();
        return false;
    }

    if (
        activeCloseTool &&
        (
            key === 13 ||
            key === 32
        )
    ) {
        e.preventDefault();
        e.stopPropagation();
        popup.close();
        return false;
    }
};

                    document.addEventListener('keydown', keyHandler, true);

                    popup.on('destroy', function () {
                        document.removeEventListener('keydown', keyHandler, true);
                    });
                };

            meMain.popup = Ext.create('Ext.grid.Panel', {
                hideHeaders: true,
                width: 280,
                title: Ext.htmlEncode(Locale.LocaleName.ResourceType),
                height: 400,
                closable: true,
                closeToolText: Ext.htmlEncode(Locale.LocaleName.CloseDialog),
                floating: true,
                modal: true,
                multiSelect: true,
                cls: 'resourceGridStyleCls',
                itemId: 'userListGrid',
                store: 'pagingStoreOwner',
                draggable: true,
                constrain: true,
                closeAction: 'destroy',

                columns: [{
                    header: Ext.htmlEncode(Locale.LocaleName.ResourceTypes),
                    dataIndex: 'name',
                    width: 300,
                    renderer: function (value, record, meta, rowI, colI) {
                        return Ext.htmlEncode(value);
                    }
                }],

                listeners: {
                    close: clearDepartmentPopup,
                    afterrender: function (popup) {
                        makeCloseToolFocusable(popup);
                        bindCloseToolKeyboard(popup);
                    },
                    show: function (popup) {
                        makeCloseToolFocusable(popup);
                    }
                },

                dockedItems: [{
                    xtype: 'textfield',
                    triggers: {
                        clear: {
                            weight: 1,
                            cls: Ext.baseCSSPrefix + 'form-clear-trigger',
                            hidden: true,
                            handler: 'onClearClick',
                            scope: 'this'
                        },
                        search: {
                            weight: 1,
                            cls: Ext.baseCSSPrefix + 'form-search-trigger',
                            handler: 'onSearchClick',
                            scope: 'this'
                        }
                    },
                    onClearClick: function () {
                        this.setValue('');
                    },
                    onSearchClick: function () {
                        var onSuccess = function (result) {
                                Ext.getStore('pagingStoreOwner').proxy.data = result.resourceTypes;
                                resourceAssignment.count = result.count;

                                if (resourceAssignment.count > 10) {
                                    meMain.popup.down('toolbar').getComponent('userGridNextButton').enable();
                                }

                                Ext.getStore('pagingStoreOwner').load();
                            },
                            onfailure = function (result) {};

                        glueforce.readFilteredResourceTypes(0, this.getValue(), 10, onSuccess, onfailure);
                    },
                    dock: 'top',
                    emptyText: Locale.LocaleName.SearchFRT,
                    enableKeyEvents: true,
                    listeners: {
                        keypress: function (field, el) {
                            if (el.getKey() === Ext.event.Event.ENTER) {
                                this.onSearchClick();
                            }
                        }
                    }
                }, {
                    xtype: 'toolbar',
                    flex: 1,
                    dock: 'bottom',
                    ui: 'footer',
                    height: 45,
                    layout: {
                        pack: 'end',
                        type: 'hbox'
                    },
                    defaults: {
                        xtype: 'button'
                    },
                    items: [{
                        iconAlign: 'left',
                        iconCls: 'icon-previous',
                        tooltip: Ext.htmlEncode(Locale.LocaleName.PreviousTimespan),
                        ariaLabel: Ext.htmlEncode(Locale.LocaleName.PreviousTimespan),
                        disabled: true,
                        height: '22px',
                        style: 'padding : 0px 7px !important',
                        itemId: 'userGridPreviousButton',
                        handler: function () {
                            var me = this;

                            me.up('panel').down('toolbar').getComponent('userGridNextButton').enable();

                            if (me.up('panel').getSelectionModel().selected.items.length) {
                                me.up('panel').getSelectionModel().selected.each(function (task) {
                                    idList.push(task.data.Id);
                                    recordList.push(task);
                                });
                            }

                            resourceAssignment.offset -= 10;

                            if (resourceAssignment.offset === 0) {
                                me.disable();
                            }

                            var onSuccess = function (result) {
                                    Ext.getStore('pagingStoreOwner').proxy.data = result.resourceTypes;
                                    resourceAssignment.count = result.count;
                                    Ext.getStore('pagingStoreOwner').load();

                                    var store = me.up('panel').store;

                                    Ext.Array.forEach(recordList, function each(each) {
                                        var indexOfSelectedRow = store.find('Id', each.data.Id);

                                        if (indexOfSelectedRow !== -1) {
                                            me.up('panel').getSelectionModel().select(indexOfSelectedRow, true);
                                        }
                                    });
                                },
                                onfailure = function (result) {};

                            glueforce.readFilteredResourceTypes(
                                resourceAssignment.offset,
                                me.up('panel').down('textfield').getValue(),
                                10,
                                onSuccess,
                                onfailure
                            );
                        }
                    }, '->', {
                        text: Ext.htmlEncode(Locale.LocaleName.Filter),
                        tooltip: Ext.htmlEncode(Locale.LocaleName.Filter),
                        itemId: 'resourceGridSelectButton',
                        cls: 'editPopUpSaveBtn',
                        handler: function () {
                            this.up('panel').getSelectionModel().selected.each(function (task) {
                                idList.push(task.data.Id);
                            });

                            var uniqueArray = idList.filter(function (item, pos) {
                                return idList.indexOf(item) === pos;
                            });

                            if (uniqueArray.length) {
                                meMain.getAllResources({
                                    resourceTypeIds: uniqueArray,
                                    ProjectIds: [],
                                    isprojectfilter: false
                                });
                            }

                            delete idList;
                            delete recordList;

                            if (meMain.popup && !meMain.popup.destroyed) {
                                meMain.popup.close();
                            }
                        }
                    }, '->', {
                        iconAlign: 'right',
                        iconCls: 'icon-next',
                        tooltip: Ext.htmlEncode(Locale.LocaleName.NextTimespan),
                        ariaLabel: Ext.htmlEncode(Locale.LocaleName.NextTimespan),
                        disabled: true,
                        height: '22px',
                        itemId: 'userGridNextButton',
                        style: 'padding : 0px 7px !important',
                        handler: function () {
                            var me = this;

                            me.up('panel').down('toolbar').getComponent('userGridPreviousButton').enable();

                            if (me.up('panel').getSelectionModel().selected.items.length) {
                                me.up('panel').getSelectionModel().selected.each(function (task) {
                                    idList.push(task.data.Id);
                                    recordList.push(task);
                                });
                            }

                            resourceAssignment.offset += 10;
                            resourceAssignment.count = resourceAssignment.count - resourceAssignment.offset;

                            if (resourceAssignment.count <= 10) {
                                me.disable();
                            }

                            var onSuccess = function (result) {
                                    Ext.getStore('pagingStoreOwner').proxy.data = result.resourceTypes;
                                    Ext.getStore('pagingStoreOwner').load();

                                    var store = me.up('panel').store;

                                    Ext.Array.forEach(recordList, function each(each) {
                                        var indexOfSelectedRow = store.find('Id', each.data.Id);

                                        if (indexOfSelectedRow !== -1) {
                                            me.up('panel').getSelectionModel().select(indexOfSelectedRow, true);
                                        }
                                    });
                                },
                                onfailure = function (result) {};

                            glueforce.readFilteredResourceTypes(
                                resourceAssignment.offset,
                                me.up('panel').down('textfield').getValue(),
                                10,
                                onSuccess,
                                onfailure
                            );
                        }
                    }]
                }]
            });

            LeankorApp.util.AccessibilityUtil.decoratePopup(meMain.popup);
            meMain.popup.showBy(combo, 'br');
            LeankorApp.util.AccessibilityUtil.initPopupKeyboardNav(meMain.popup, combo);
            meMain.bindResourceGridCloseToolKeys(meMain.popup, combo);

            makeCloseToolFocusable(meMain.popup);
            bindCloseToolKeyboard(meMain.popup);

            combo.reset();
            break;

        case "By Role Hierarchy":
            storeTree = Ext.getStore('roleHierarchy');
            storeTree.removeAll();

            var popup = Ext.create('Ext.tree.Panel', {
                width: 280,
                title: Locale.LocaleName.RoleHierarchy,
                closeToolText: Locale.LocaleName.CloseDialog,
                height: 450,
                store: 'roleHierarchy',
                closable: true,
                floating: true,
                modal: true,
                itemId: 'userRoleListGrid',
                mode: 'MULTI',
                multiSelect: true,
                rootVisible: false,
                displayField: 'Name',
                allowDeselect: true,
                cls: 'mycustomTree_Role',
                draggable: true,
                listeners: {
                    cellclick: function (me, td, cellIndex, record, tr, rowIndex, e, eOpts) {
                        var mee = this,
                            idList = [];

                        mee.dorec = function (rec, index) {
                            rec.SubordinateRoles.forEach(mee.dorec);
                            idList.push(rec.RoleId);
                        };

                        Ext.Array.forEach(record.data.SubordinateRoles, mee.dorec);
                        idList.push(record.data.RoleId);

                        if (idList.length) {
                            meMain.getAllResources({
                                resourceTypeIds: idList,
                                ProjectIds: [],
                                UserIDs: [],
                                isprojectfilter: false
                            });
                        }

                        popup.close();
                    }
                }
            });

            meMain.bindResourceTypePopupAccessibility(popup, {
                label: Locale.LocaleName.RoleHierarchy,
                recordLabelPrefix: (Locale.LocaleName && Locale.LocaleName.RoleHierarchy) || 'Role',
                focusTarget: combo
            });

            meMain.bindHeaderPopupKeys(popup, {
                activateRows: true,
                focusTarget: combo,
                rowEnterHandler: function (popup, record) {
                    meMain.applyRoleHierarchyFilter(record, popup);
                },
                enterHandler: function (popup) {
                    meMain.applyRoleHierarchyFilter(
                        meMain.getHeaderPopupRecord(popup),
                        popup
                    );
                }
            });

            popup.setLoading(Ext.htmlEncode(Locale.LocaleName.Loading) + '...');

            glueforce.getRoleHierarchy(function (columnSuccess) {
                if (columnSuccess.length) {
                    columnSuccess = columnSuccess[0].SubordinateRoles;
                    storeTree.proxy.data = columnSuccess;
                    storeTree.add(columnSuccess);
                    storeTree.load();
                    popup.setLoading(false);
                }
            });

            this.updatePopupOverflow(popup);
            popup.showBy(combo, 'tc-bc?');
            combo.reset();
            break;

        default:
            break;
    }
},

    /**
    @Method - getAllResources
    @param - obj , object containg list of filters.
    @Description  - This method calls getAllResources and pass param obj and after fetching all data , put them all in store and load RM view.
     */
    getAllResources: function (obj) {
        LeankorApp.Gantt.getView().setLoading(Ext.htmlEncode(Locale.LocaleName.Loading) + '...');
        var me = this,
            weekendDays,
            taskStore = LeankorApp.Gantt.gantt.taskStore,
            assignmentgridpanel = Ext.ComponentQuery.query('[xtype=assignmentgridpanel]')[0],
            mapOfSameResourceType = new Map();
        mapOfSameResourceName = new Map();
        me.objFilter = obj;
        me.objFilter.StartDate = JSON.parse(JSON.stringify(LeankorApp.Gantt.gantt.timeAxis.adjustedStart));
        me.objFilter.DueDate = JSON.parse(JSON.stringify(LeankorApp.Gantt.gantt.timeAxis.adjustedEnd));

        var partnerView = null;
        if (btype == 'ru') {
            partnerView = Ext.ComponentQuery.query('[xtype=resourceschedule]')[0];
        } else {
            partnerView = assignmentgridpanel;
        }
        partnerView.suspendRefresh();
        partnerView.suspendLayouts();
        LeankorApp.Gantt.getView() && LeankorApp.Gantt.getView().suspendLayouts();
        glueforce.readAllResourceTypes(obj, function (result) {
            resourceStoreType = Ext.getStore('resourcesStoreCustom');
            var resourceStore = taskStore.resourceStore,
                assignmenetStore = Ext.getStore('assignmentStore'),
                defaultCalendar = taskStore.getCalendar();
            portfolio.workingHoursPerDay = result.workingHoursPerDay;
            weekendDays = me.getWeekendDays();
            // var calendarSevenDays = Ext.create('Gnt.data.calendar.BusinessTime', {
            // calendarId: 'calendarSevenDays',

            // daysPerWeek: 7,
            // daysPerMonth: 30,
            // weekendFirstDay: weekendDays.first,
            // weekendSecondDay: weekendDays.second,
            // weekendsAreWorkdays: true
            // }),
            defaultCalendar.defaultAvailability = me.getCalendarAvailability(portfolio.workingHoursPerDay);
            defaultCalendar.hoursPerDay = portfolio.workingHoursPerDay;
            var calendarFivsDays = Ext.create('Gnt.data.calendar.BusinessTime', {
                calendarId: 'calendarFivsDays',
                defaultAvailability: me.getCalendarAvailability(portfolio.workingHoursPerDay),
                hoursPerDay: portfolio.workingHoursPerDay,
                daysPerWeek: 5,
                daysPerMonth: 20,
                weekendFirstDay: weekendDays.first,
                weekendSecondDay: weekendDays.second,
                weekendsAreWorkdays: false
            });

            taskStore.setCalendar(defaultCalendar, true);
            resourceStore.clearData();
            assignmenetStore.clearData();
            taskStore.clearData();
            // if (result.ResourceUsersData.length) {
            if (result.resourceTypes.length) {

                // var resourceCalendarData = result.ResourceUsersData[0].ResourceHoursData;
                var resourceCalendarData = result.resourceTypes[0].ResourceHoursData ? result.resourceTypes[0].ResourceHoursData : [];
                me.dorec = function (card, index) {
                    if (Array.isArray(card.children)) {
                        card.children.forEach(me.dorec);
                    }
                    card.leaf = true;
                    card.children = [];
                    card.DueDate = new Date(JSON.parse(card.DueDate));
                    card.StartDate = new Date(JSON.parse(card.StartDate));
                    card.DurationUnits = me.convertDUInGanttFormat(card.DurationUnits);
                    me.setFixedTime(card.DueDate, card.StartDate, card.DurationUnits, card.EstimatedDuration);
                    card.EffortUnit = me.convertDUInGanttFormat(card.EffortUnit);
                    if (!resourceCalendarData.length) {
                        card.CalendarId = card.SevenDayWorkWeek ? 'calendarSevenDays' : 'calendarFivsDays';
                    }
                };
                Ext.Array.forEach(result.resourceCards, me.dorec);
                if (result.resourceCards) {
                    taskStore.proxy.data = result.resourceCards;
                    taskStore.load();
                    taskStore.sortByType();
                }
                if (result.resourceAssignments) {
                    assignmenetStore.loadData(result.resourceAssignments);
                    assignmenetStore.sortByType();
                }
                //create a map contains data of resources with same resourceType
                Ext.Array.forEach(result.resources, function (resource) {
                    if (mapOfSameResourceType.getSize() && mapOfSameResourceType.get(resource.resourceTypeId)) {
                        var typeData = mapOfSameResourceType.get(resource.resourceTypeId);
                        typeData = typeData.concat(resource);
                        mapOfSameResourceType.set(resource.resourceTypeId, typeData);
                    } else {
                        mapOfSameResourceType.set(resource.resourceTypeId, [resource]);
                    }
                    if (!mapOfSameResourceName.get(resource.Id)) {
                        mapOfSameResourceName.set(resource.Id, {
                            'name': resource.name,
                            'resourceTypeId': resource.resourceTypeId
                        });
                    }

                });
                Ext.Array.forEach(result.resourceTypes, function (resourceType) {
                    if (!mapOfSameResourceName.get(resourceType.Id)) {
                        mapOfSameResourceName.set(resourceType.Id, {
                            'name': resourceType.name,
                            'resourceTypeId': resourceType.Id
                        });
                    }

                });
                resourceStoreType.loadData(result.resources);
                taskStore.each(function (task) {
                    var assignments = task.getAssignments(),
                        unit = 0,
                        workingHours = portfolio.workingHoursPerDay,
                        mapOfNewAssignment = new Map();

                    resourceTypeIds = [];
                    task.data.assignmentData = []; //put original assignment data in a variable to use it while displaying name in namecolumn
                    taskStore.assignmentStore.removeAssignmentsForTask(task);
                    Ext.Array.forEach(assignments, function (assignment) {
                        if (mapOfSameResourceName.getSize()) {
                            var resourceName = mapOfSameResourceName.get(assignment.data.ResourceId);
                            if (resourceName) {
                                task.data.assignmentData.push({
                                    'resourceName': resourceName.name,
                                    'units': assignment.data.Units,
                                    'resourceTypeId': resourceName.resourceTypeId
                                });
                            }
                        }
                        newAssignmentData = assignment;
                        var resourceData = resourceStoreType.getById(assignment.data.ResourceId);

                        duration = 0;
                        if (resourceData) {
                            var existingAss = task.getAssignmentFor(resourceData.data.resourceTypeId); //check if the task has already has an assignment added throgh this code only , for same resource type
                            var resources = mapOfSameResourceType.get(resourceData.data.resourceTypeId);
                            resourceTypeIds.indexOf(resourceData.data.resourceTypeId) == -1 && resourceTypeIds.push(resourceData.data.resourceTypeId);
                            if (resources.length) {
                                Ext.Array.forEach(resources, function (resource) {
                                    if (assignment.data.ResourceId == resource.Id) {
                                        if (mapOfNewAssignment.get(resource.resourceTypeId) == null) {
                                            unit += assignment.data.Units;
                                            mapOfNewAssignment.set(resource.resourceTypeId, {
                                                'Id': resource.resourceTypeId,
                                                'units': unit
                                            });
                                        } else {
                                            var data = mapOfNewAssignment.get(resource.resourceTypeId);
                                            data.unit += assignment.data.Units;
                                            mapOfNewAssignment.set(resource.resourceTypeId, {
                                                'Id': resource.resourceTypeId,
                                                'units': data.unit
                                            });
                                        }
                                    }
                                })

                            }
                            if (existingAss) {
                                assignment.data.Units += existingAss.data.Units;
                                existingAss.set({
                                    'ResourceId': existingAss.data.ResourceId,
                                    'Units': assignment.data.Units
                                });
                            } else {
                                mapOfNewAssignment.forEach(function (newAss) {
                                    newAssignmentData.set({
                                        'ResourceId': newAss.Id,
                                        'Units': newAss.units,
                                        'duration': newAss.duration
                                    });
                                    assignmenetStore.add(newAssignmentData);
                                });
                            }
                        } else {
                            var existingAss = task.getAssignmentFor(assignment.data.ResourceId); //check if the task has already has an assignment added throgh this code only , for same resource type
                            // if(assignment.isResourceType){
                            if (mapOfNewAssignment.get(assignment.data.ResourceId) == null) {
                                unit += assignment.data.Units;
                                mapOfNewAssignment.set(assignment.data.ResourceId, {
                                    'Id': assignment.data.ResourceId,
                                    'units': unit
                                });
                            } else {
                                var data = mapOfNewAssignment.get(assignment.data.ResourceId);
                                data.unit += assignment.data.Units;
                                mapOfNewAssignment.set(assignment.data.ResourceId, {
                                    'Id': assignment.data.ResourceId,
                                    'units': data.unit
                                });
                            }
                            if (existingAss) {
                                assignment.data.Units += existingAss.data.Units;
                                existingAss.set({
                                    'ResourceId': assignment.data.ResourceId,
                                    'Units': assignment.data.Units
                                });
                            } else {
                                newAssignmentData.set({
                                    'ResourceId': assignment.data.ResourceId,
                                    'Units': assignment.data.Units
                                });
                                assignmenetStore.add(newAssignmentData);
                            }
                        }
                        // }


                        // if(resourceStore.getById(resourceData.data.Id){
                        // duration += workingHours;
                        // }
                    });

                });

                var arrayOfUserRecord = [];
                if (resourceCalendarData.length) {
                    //Put it inside loop when we have multiple calendars
                    //Override default calendar
                    Ext.Array.forEach(result.resourceType, function (resource) {
                        var calendar = Ext.create('Gnt.data.calendar.BusinessTime', {
                            parent: 'calendarFivsDays',
                            daysPerWeek: 5,
                            daysPerMonth: 20,
                            weekendFirstDay: weekendDays.first,
                            weekendSecondDay: weekendDays.second,
                            weekendsAreWorkdays: false,
                            calendarId: 'RSCalendar' + result.ResourceUsersData[0].UserRecord.Id
                        });
                        var calendarid = LeankorApp.Gantt.overrideCalendarDays(resourceCalendarData, calendar, weekendDays);
                        Ext.Array.forEach(result.ResourceUsersData, function each(resData) {
                            resData.UserRecord.CalendarId = calendarid;
                            arrayOfUserRecord.push(resData.UserRecord);
                        });
                    })

                } else {
                    // Ext.Array.forEach(result.resourceType, function(resource){
                    // var calendar = Ext.create('Gnt.data.calendar.BusinessTime', {
                    // parent: 'calendarFivsDays',
                    // daysPerWeek: 5,
                    // daysPerMonth: 20,
                    // weekendFirstDay: weekendDays.first,
                    // weekendSecondDay: weekendDays.second,
                    // weekendsAreWorkdays: false,
                    // calendarId: 'RSCalendar' + result.resourceTypes[0].Id
                    // }),
                    // assignment =
                    // calendarid = LeankorApp.Gantt.overrideCalendarDays(null, calendar, weekendDays , );
                    // Ext.Array.forEach(result.ResourceUsersData, function each(resData) {
                    // resData.UserRecord.CalendarId = calendarid;
                    // arrayOfUserRecord.push(resData.UserRecord);
                    // });
                    // })

                }
                resourceStore.each(function (res) {
                    res.resourceCount = res.relatedResources ? res.relatedResources.length : 0;
                });
                resourceStore.loadData(result.resourceTypes);
                LeankorApp.Gantt.getView() && LeankorApp.Gantt.getView().resumeLayouts(true);

                setTimeout(function () {
                    assignmentgridpanel.getStore().sort('Name', 'ASC');
                    LeankorApp.Gantt.getView().setLoading(false);
                    // Resource types are now on the board — land keyboard focus on
                    // the board's column divider once the board has actually
                    // re-laid out, instead of guessing with a fixed delay. The
                    // focus move is keyboard-only and won't override a focus the
                    // user has already moved (see focusBoardSplitter).
                    var boardView = LeankorApp.Gantt.getView();
                    if (boardView && boardView.on) {
                        boardView.on('refresh', function () {
                            LeankorApp.util.AccessibilityUtil.focusBoardSplitter();
                        }, null, { single: true });
                    } else {
                        LeankorApp.util.AccessibilityUtil.focusBoardSplitter();
                    }
                }, 2000);
            } else {

                LeankorApp.Gantt.getView() && LeankorApp.Gantt.getView().resumeLayouts(true);
                //Fixing issue-'RM previous project is not refreshing when filtering with new project'
                var gantt = LeankorApp.Gantt.gantt;
                LeankorApp.Gantt.gantt.setViewPreset(gantt.viewPreset, new Date(gantt.getStart()), gantt.getEnd());

                //eOf code
                LeankorApp.Gantt.getView().setLoading(false);
            }

            // LeankorApp.Gantt.gantt.refreshViews();

            partnerView.resumeLayouts();
            partnerView.resumeRefresh(true)
            // partnerView.refreshViews(true);
        });

    },
    /**
    @method : setCurrentTime
    @param : dtEnd - End date
    dtStart - Start Date
    @Description - This method set time portion of dates to current time. We need to save current time with dates in DB.
     */
    setCurrentTime: function (dtEnd, dtStart) {
        var todayDate = new Date();
        if (dtEnd) {
            dtEnd.setHours(todayDate.getHours(), todayDate.getMinutes(), todayDate.getSeconds());
        }
        if (dtStart) {
            dtStart.setHours(todayDate.getHours(), todayDate.getMinutes(), todayDate.getSeconds());
        }
    },

    /**
    @method : setFixedTime
    @param : dtEnd - End date
    dtStart - Start Date
    @Description - This method set time portion of dates to a fixed time.
     */
    setFixedTime: function (dtEnd, dtStart, unit, duration) {
        if (dtStart) {
            dtStart.setHours('00', '00', '00');
        }
        if (unit == 'mi' || unit == 'minutes' || unit == 'minute') {
            unit = 'h';
            duration = duration / (60); // convert minute into hours
        }
        if (unit == 'Hours' || unit == 'Hour' || unit == 'h') {
            var hours = 0;
            if (duration > portfolio.workingHoursPerDay) {
                hours = duration % portfolio.workingHoursPerDay;
            } else if (duration < portfolio.workingHoursPerDay) {
                hours = duration;
            } else {
                hours = 0;
            }
            if (dtEnd) {
                if (hours == 0) {
                    dtEnd.setHours('23', '59', '00');
                } else {
                    availability = LeankorApp.Gantt.getCalendarAvailability(portfolio.workingHoursPerDay, true);
                    if (hours >= parseFloat(availability.firstShiftEnd) && hours <= parseFloat(availability.secondShiftStart)) {
                        hours = Math.round(parseFloat(availability.secondShiftStart) + (hours - parseFloat(availability.firstShiftEnd)));
                    }
                    hours = Math.round(hours + 1);
                    if (parseFloat(availability.firstShiftStart) == 1 && hours == 1) {
                        hours += 1;
                    }
                    dtEnd.setHours(hours, '00', '00');
                }
            }
        } else {
            if (dtEnd) {
                dtEnd.setHours('23', '59', '00');
            }
        }

    },
    /**
    @Method - convertDUInGanttFormat
    @param - du , duration unit in full form.
    @Description  - This method converts Duration unit in gantt supported forms.
     */
    convertDUInGanttFormat: function (du) {
        var durationFormate = 'd';
        switch (du) {
            case "Days":
                durationFormate = "d";
                break;
            case "Hours":
                durationFormate = "h";
                break;
            case "Months":
                durationFormate = "mo";
                break;
            case "Years":
                durationFormate = "y";
                break;
            case "Weeks":
                durationFormate = "w";
                break;
            case "Minutes":
                durationFormate = "mi";
                break;
            default:
                break;
        }
        return durationFormate;
    },
    /**
    @Method - convertDUInFullForm
    @param - du , duration unit in gantt supported form(Abbreviated form).
    @Description  - This method converts Duration unit in full form supported by Apex and other UI end.
     */
    convertDUInFullForm: function (du) {
        var durationFormate = 'Days';
        switch (du) {
            case "d":
                durationFormate = "Days";
                break;
            case "h":
                durationFormate = "Hours";
                break;
            case "mo":
                durationFormate = "Months";
                break;
            case "y":
                durationFormate = "Years";
                break;
            case "w":
                durationFormate = "Weeks";
                break;
            case "mi":
                durationFormate = "Minutes";
                break;
            default:
                break;
        }
        return durationFormate;
    },
    applyFilters: function () {
        if (Ext.ComponentQuery.query("#searchfilterfield")[0].getValue() != '') {
            var value = Ext.ComponentQuery.query("#searchfilterfield")[0].getValue(),
                regexp = new RegExp(Ext.String.escapeRegex(value), 'i')
            LeankorApp.Gantt.gantt.taskStore.resourceStore.filter('name', regexp);
        } else {
            LeankorApp.Gantt.gantt.taskStore.resourceStore.clearFilter();
        }
    },
    /**@Modified by Bhupendra (date: 25-may-2018)
     * @Description: override calendar working day with our custom business hours.
     * @return {Ext.String} Id of calendar
     * @param {Ext.Array} business hours data								calendarDays
     * @param {Gnt.data.calendar.BusinessTime}								calendar
     * @param custome weekend {Ext.Object}									weekendDays
     */

    overrideCalendarDays: function (calendarDays, calendar, weekendDays) {

        Ext.Array.forEach(calendarDays, function (eachDay) {
            var flag = false;
            if (eachDay.OverrideStartDate && eachDay.OverrideStartDate) {
                eachDay.OverrideEndDate = new Date(eachDay.OverrideEndDate);
                eachDay.OverrideStartDate = new Date(eachDay.OverrideStartDate);
                eachDay.OverrideEndDate.setHours(23, 59, 00);
                eachDay.OverrideEndDate = Ext.Date.add(eachDay.OverrideEndDate, Ext.Date.DAY, -1);
                eachDay.OverrideStartDate.setHours(00, 00, 00);
            }
            eachDay.Date = eachDay.ResourceDate && new Date(eachDay.ResourceDate);
            eachDay.ResourceDate && eachDay.Date.setHours(00, 00, 00);
            if (eachDay.Type == 'WEEKDAYOVERRIDE') {
                if (eachDay.isDailyWeekDayHoliday || eachDay.Weekday == null) { // Means we are having overlapping for same dates with 2 different availabilty or having holidays on same dates.
                    var count = 0;
                    flag = true;
                    while (1) {
                        var thidRecord = {};

                        thidRecord.Date = count ? Ext.Date.add(eachDay.OverrideStartDate, Ext.Date.DAY, count) : eachDay.OverrideStartDate;
                        count++;
                        if (eachDay.Weekday == null || thidRecord.Date.getDay() == eachDay.Weekday) {
                            thidRecord.Type = 'DAY';
                            thidRecord.Availability = eachDay.Availability;
                            thidRecord.IsWorkingDay = eachDay.IsWorkingDay;
                            if (thidRecord.Availability[0] == '00:00-00:00') {
                                thidRecord.IsWorkingDay = false;
                            }
                            if (!thidRecord.IsWorkingDay) {
                                thidRecord.Availability = [];
                            }
                            var record = calendar.findRecord('Id', 'id-' + thidRecord.Date);
                            if (record) {
                                if (thidRecord.IsWorkingDay == true) {
                                    for (var k = 0; k < record.data.Availability.length; k++) {
                                        if (thidRecord.Availability.indexOf(record.data.Availability[k]) == -1) {
                                            thidRecord.Availability.push(record.data.Availability[k]);
                                        }
                                    }
                                }
                            }

                            thidRecord.Id = 'id-' + thidRecord.Date;
                            if (thidRecord.Date.getDay() != weekendDays.first && thidRecord.Date.getDay() != weekendDays.second) { // If request come for Daily Weekday avaialability (like lunch) , do not add weekends data
                                calendar.add(thidRecord);
                            }
                        }
                        if (thidRecord.Date.getTime() == eachDay.OverrideEndDate.getTime()) {
                            break;
                        }
                    }
                }
            }
            if (!flag) {
                if (!eachDay.IsWorkingDay) {
                    eachDay.Availability = [];
                }
                var record = calendar.findRecord('Id', 'id-' + eachDay.Date);
                if (record) {
                    if (eachDay.IsWorkingDay == true) {
                        for (var k = 0; k < record.data.Availability.length; k++) {
                            if (eachDay.Availability.indexOf(record.data.Availability[k]) == -1) {
                                eachDay.Availability.push(record.data.Availability[k]);
                            }
                        }
                    }
                }
                if (eachDay.Date) {
                    eachDay.Id = 'id-' + eachDay.Date;
                }
                calendar.add(eachDay);
            }

        });
        return calendar.calendarId;
    },
    getCalendarAvailability: function (workingHours, returnShift) {

        var avaialability = [];
        if (workingHours == 23) {
            avaialability = ['01:00-24:00'];
        } else if (workingHours == 24) {
            avaialability = ['00:00-24:00'];
        } else {
            var NumberOfHoursPerShift = workingHours / 2,
                NumberOfHoursFirstShift = Math.floor(NumberOfHoursPerShift),
                NumberOfHoursSecondShift = Math.ceil(NumberOfHoursPerShift),
                firstShiftStart = 1,
                firstShiftEnd = 1 + NumberOfHoursFirstShift,
                secondShiftStart = 23 - NumberOfHoursSecondShift,
                secondShiftEnd = 23;

            firstShiftStart = firstShiftStart.toString().length == 1 ? '0' + firstShiftStart.toString() : firstShiftStart.toString();
            firstShiftEnd = firstShiftEnd.toString().length == 1 ? '0' + firstShiftEnd.toString() : firstShiftEnd.toString();
            secondShiftStart = secondShiftStart.toString().length == 1 ? '0' + secondShiftStart.toString() : secondShiftStart.toString();
            secondShiftEnd = secondShiftEnd.toString().length == 1 ? '0' + secondShiftEnd.toString() : secondShiftEnd.toString();
            avaialability = [firstShiftStart + ':00-' + firstShiftEnd + ':00', secondShiftStart + ':00-' + secondShiftEnd + ':00'];
        }
        if (returnShift && returnShift == true) {
            return {
                firstShiftStart: firstShiftStart,
                firstShiftEnd: firstShiftEnd,
                secondShiftStart: secondShiftStart,
                secondShiftEnd: secondShiftEnd
            }
        }
        return avaialability;

    },
    sanitizeValue: function (value) {
        return value.startsWith('https:') && value;
    },
    /**
     * global method to show alert messages
     * @param {String}			str
     */
    messagePopUp: function (cfg) {
        cfg = cfg || {};
        if (cfg.msg && cfg.msg.indexOf('messagepopUpCls') === -1) {
            cfg.msg = '<div class="messagepopUpCls">' + Ext.htmlEncode(cfg.msg) + '</div>';
        }
        if (cfg.message && cfg.message.indexOf('messagepopUpCls') === -1) {
            cfg.message = '<div class="messagepopUpCls">' + Ext.htmlEncode(cfg.message) + '</div>';
        }

        Ext.applyIf(cfg, {
            cls: 'alertMsgCls',
            modal: true,
            scrollable: null,
            closable: false,
            draggable: true,
            closeAction: 'destroy',
            multiline: false
        });

        if (cfg.buttons === Ext.Msg.YESNO) {
            Ext.applyIf(cfg, {
                buttonText: {
                    yes: Locale.LocaleName.Yes,
                    no: Locale.LocaleName.No
                },
                buttonUIs: {
                    yes: 'saveBtnClss',
                    no: 'cancelBtnClss'
                },
                buttonTips: {
                    yes: Locale.LocaleName.Yes,
                    no: Locale.LocaleName.No
                }
            });
        } else {
            Ext.applyIf(cfg, {
                buttons: Ext.Msg.OK,
                buttonText: {
                    ok: Locale.LocaleName.OK
                },
                buttonUIs: {
                    ok: 'saveBtnClss'
                },
                buttonTips: {
                    ok: Locale.LocaleName.OK
                }
            });
        }

        return Ext.Msg.show(cfg);
    },
    alertMsgBox: function (str) {
        return this.messagePopUp({
            message: str,
            buttons: Ext.Msg.OK
        });
    },
    confirmMsgBox: function (msg, fn) {
        return this.messagePopUp({
            msg: msg,
            buttons: Ext.Msg.YESNO,
            fn: fn
        });
    },
    /**
     * @Method checkOffDaysWeek, to check dynamically weekend according to force.com value
     * @return object shows off days
     **/
    getWeekendDays: function () {
        // secondDay like sunday we assume
        // firstDay like Saturday we assume
        var firstDayOfTheWeek = glueforce.getWorkspaceConfig().FirstDayOfTheWeek,
            firstDay,
            secondDay;
        if (Ext.isEmpty(firstDayOfTheWeek) || firstDayOfTheWeek > 6 || firstDayOfTheWeek < 0) {
            firstDayOfTheWeek = 1;
        }
        secondDay = firstDayOfTheWeek - 1;
        if (secondDay < 0) {
            secondDay = 6;
        }
        firstDay = secondDay - 1;
        if (firstDay < 0) {
            firstDay = 6;
        }
        return {
            first: firstDay,
            second: secondDay
        }
    },

    onAddNewResources: function (header, column, e, event) {
        if (e.target.className !== "addBtnTop") {
            return true;
        }
        var ganttPanel = LeankorApp.Gantt.gantt,
            meMain = this,
            closeFocusTarget = e && e.target ? e.target : column;
        if (closeFocusTarget && !closeFocusTarget.hasAttribute('tabindex')) {
            closeFocusTarget.setAttribute('tabindex', '-1');
        }
        resourceAssignment.count = 0;
        resourceAssignment.offset = 0;
        Ext.getStore('pagingStoreOwner').removeAll();
        var idList = [],
            recordList = [];
        meMain.popup = Ext.create('Ext.grid.Panel', {
            hideHeaders: true,
            width: 280,

            title: Ext.htmlEncode(Locale.LocaleName.ResourceTypes),
            closeToolText: Ext.htmlEncode(Locale.LocaleName.CloseDialog),

            height: 400,
            closable: true,
            floating: true,
            modal: true,
            multiSelect: true,
            cls: 'resourceGridStyleCls',
            itemId: 'userListGrid',
            store: 'pagingStoreOwner',
            draggable: true,
            constrain: true,
            columns: [{
                header: 'Resource Type',
                dataIndex: 'name',
                width: 300,
                renderer: function (value, record, meta, rowI, colI) {
                    return Ext.htmlEncode(value);
                }
            }
            ],
            listeners: {
                // Suppress focus-driven scrolling only while this panel is open so
                // opening it at >100% zoom doesn't jump the parent Lightning page.
                beforeshow: function () {
                    LeankorApp.suppressFocusScroll = true;
                },
                hide: function () {
                    LeankorApp.suppressFocusScroll = false;
                },
                close: function () {
                    LeankorApp.suppressFocusScroll = false;
                    if (meMain.popup) {
                        meMain.popup = null;
                    }
                }
            },
            dockedItems: [{
                xtype: 'textfield',
                triggers: {
                    clear: {
                        weight: 1,
                        cls: Ext.baseCSSPrefix + 'form-clear-trigger',
                        hidden: true,
                        handler: 'onClearClick',
                        scope: 'this'
                    },
                    search: {
                        weight: 1,
                        cls: Ext.baseCSSPrefix + 'form-search-trigger',
                        handler: 'onSearchClick',
                        scope: 'this'
                    }
                },
                onClearClick: function () {
                    this.setValue('');
                },

                onSearchClick: function () {
                    glueforce.readFilteredResourceTypes(0, this.getValue(), 10, function (result) {
                        Ext.getStore('pagingStoreOwner').proxy.data = result.resourceTypes;
                        resourceAssignment.count = result.count;
                        if (resourceAssignment.count > 10) {
                            meMain.popup.down('toolbar').getComponent('userGridNextButton').enable();
                        }
                        Ext.getStore('pagingStoreOwner').load();
                    }, function (result) { });
                },
                dock: 'top',
                emptyText: Locale.LocaleName.SearchFRT,
                enableKeyEvents: true,
                listeners: {
                    keypress: function (field, el) {
                        if (el.getKey() == Ext.event.Event.ENTER)
                            this.onSearchClick();
                    }
                }
            }, {
                xtype: 'toolbar',
                flex: 1,
                dock: 'bottom',
                ui: 'footer',
                height: 45,
                layout: {
                    pack: 'end',
                    type: 'hbox'
                },
                defaults: {
                    xtype: 'button'
                    // scale : 'small',
                },
                items: [{
                    iconAlign: 'left',
                    iconCls: 'icon-previous',
                    tooltip: Ext.htmlEncode(Locale.LocaleName.PreviousTimespan),
                    ariaLabel: Ext.htmlEncode(Locale.LocaleName.PreviousTimespan),
                    disabled: true,
                    height: '22px',
                    style: 'padding : 0px 7px !important',
                    itemId: 'userGridPreviousButton',
                    handler: function () {
                        var me = this;
                        me.up('panel').down('toolbar').getComponent('userGridNextButton').enable();

                        //Save all selected records in a variable before updating the view with new data
                        if (me.up('panel').getSelectionModel().selected.items.length) {
                            me.up('panel').getSelectionModel().selected.each(function (task) {
                                idList.push(task.data.Id);
                                recordList.push(task);
                            });
                        }
                        resourceAssignment.offset -= 10;
                        if (resourceAssignment.offset == 0)
                            me.disable();

                        var onSuccess = function (result) {
                            Ext.getStore('pagingStoreOwner').proxy.data = result.resourceTypes;
                            resourceAssignment.count = result.count;
                            Ext.getStore('pagingStoreOwner').load();
                            var store = me.up('panel').store;
                            Ext.Array.forEach(recordList, function each(each) {
                                var indexOfSelectedRow = store.find('Id', each.data.Id);
                                if (indexOfSelectedRow != -1)
                                    me.up('panel').getSelectionModel().select(indexOfSelectedRow, true);
                            });
                        },
                            onfailure = function (result) { };
                        glueforce.readFilteredResourceTypes(resourceAssignment.offset, me.up('panel').down('textfield').getValue(), 10, onSuccess, onfailure);

                    }
                }, '->', {
                    text: Ext.htmlEncode(Locale.LocaleName.SelectLbl),
                    tooltip: Ext.htmlEncode(Locale.LocaleName.SelectLbl),
                    itemId: 'resourceGridSelectButton',
                    cls: 'editPopUpSaveBtn',
                    handler: function () {
                        var resourceStore = LeankorApp.Gantt.gantt.taskStore.resourceStore;
                        this.up('panel').getSelectionModel().selected.each(function (resource) {

                            // if (resourceStore.find('Id', resource.data.Id) == -1) {
                            idList.push(resource.data.Id);
                            // }
                        });
                        var uniqueArray = idList.filter(function (item, pos) { //remove duplicate
                            return idList.indexOf(item) == pos;
                        });
                        if (uniqueArray.length) {
                            var obj = meMain.objFilter;
                            if (typeof obj != 'undefined') {
                                obj.resourceTypeIds = obj.resourceTypeIds.concat(uniqueArray);
                            } else {
                                obj = {
                                    // AllRoleIds: [],
                                    ProjectIds: [],
                                    resourceTypeIds: uniqueArray,
                                    isprojectfilter: false
                                };
                            }
                            meMain.getAllResources(obj);

                        }
                        delete idList;
                        delete recordList;
                        meMain.popup.close();
                    }
                }, '->', {

                    iconAlign: 'right',
                    iconCls: 'icon-next',
                    tooltip: Ext.htmlEncode(Locale.LocaleName.NextTimespan),
                    ariaLabel: Ext.htmlEncode(Locale.LocaleName.NextTimespan),
                    disabled: true,
                    height: '22px',
                    itemId: 'userGridNextButton',
                    style: 'padding : 0px 7px !important',
                    handler: function () {
                        var me = this;
                        me.up('panel').down('toolbar').getComponent('userGridPreviousButton').enable();

                        //Save all selected records in a variable before updating the view with new data
                        if (me.up('panel').getSelectionModel().selected.items.length) {
                            me.up('panel').getSelectionModel().selected.each(function (task) {
                                idList.push(task.data.Id);
                                recordList.push(task);
                            });
                        }
                        resourceAssignment.offset += 10;
                        resourceAssignment.count = resourceAssignment.count - resourceAssignment.offset;
                        if (resourceAssignment.count <= 10) {
                            me.disable();
                        }
                        var onSuccess = function (result) {
                            Ext.getStore('pagingStoreOwner').proxy.data = result.resourceTypes;
                            Ext.getStore('pagingStoreOwner').load();

                            var store = me.up('panel').store;
                            Ext.Array.forEach(recordList, function each(each) {
                                var indexOfSelectedRow = store.find('Id', each.data.Id);
                                if (indexOfSelectedRow != -1)
                                    me.up('panel').getSelectionModel().select(indexOfSelectedRow, true);
                            });

                        },
                            onfailure = function (result) { };
                        glueforce.readFilteredResourceTypes(resourceAssignment.offset, me.up('panel').down('textfield').getValue(), 10, onSuccess, onfailure);
                    }
                }
                ]
            }
            ],

        });
        LeankorApp.util.AccessibilityUtil.decoratePopup(meMain.popup);
        meMain.popup.showBy(column, 'br');
        LeankorApp.util.AccessibilityUtil.initPopupKeyboardNav(meMain.popup, closeFocusTarget);
        // Close on Enter/Space on the X tool (and Esc), in one press — same
        // capture-phase handler the Resource Type popup uses. Without this, Enter
        // on the focused close icon does not close the popup.
        meMain.bindResourcePopupCloseKeys(meMain.popup);

    },

    /**
     * Capture-phase keyboard close for the floating resource grid popups.
     * Esc closes; Enter/Space closes when focus is on the close (X) tool — or
     * anywhere in the header, since the header is an ExtJS FocusableContainer and
     * DOM focus can sit on the header rather than the tool itself on first focus.
     * The native listener is removed when the popup is destroyed.
     */
    bindResourcePopupCloseKeys: function (popup) {
        var keyHandler;

        if (!popup || popup._resourceCloseToolKeyBound) {
            return;
        }
        popup._resourceCloseToolKeyBound = true;

        keyHandler = function (e) {
            var key = e.keyCode || e.which,
                activeEl = document.activeElement,
                closeToolCmp,
                closeToolEl,
                headerCmp,
                headerDom,
                activeCloseTool;

            if (!popup || popup.destroyed || popup.destroying || !popup.el) {
                return;
            }

            closeToolCmp = popup.down('tool[type=close]');
            closeToolEl = closeToolCmp && closeToolCmp.el;
            activeCloseTool = false;

            if (closeToolEl && closeToolEl.dom && activeEl) {
                headerCmp = (closeToolCmp && closeToolCmp.ownerCt) ||
                    (popup.getHeader && popup.getHeader());
                headerDom = headerCmp && headerCmp.el && headerCmp.el.dom;

                activeCloseTool =
                    closeToolEl.dom === activeEl ||
                    closeToolEl.dom.contains(activeEl) ||
                    !!Ext.fly(activeEl).up('.x-tool-close', popup.el, true) ||
                    !!Ext.fly(activeEl).up('.x-tool', popup.el, true) ||
                    !!(headerDom && (headerDom === activeEl || headerDom.contains(activeEl)));
            }

            if (key === 27) {
                e.preventDefault();
                e.stopPropagation();
                popup.close();
                return false;
            }

            if (activeCloseTool && (key === 13 || key === 32)) {
                e.preventDefault();
                e.stopPropagation();
                popup.close();
                return false;
            }
        };

        document.addEventListener('keydown', keyHandler, true);
        popup.on('destroy', function () {
            document.removeEventListener('keydown', keyHandler, true);
        });
    },

    /**
    @Method - addNewResources
    @param - obj , object containg list of filters.
    @Description  - This method calls addNewResources and pass param obj and after fetching all data , put them all in store and load RM view.
     */
    addNewResources: function (obj) {
        LeankorApp.Gantt.getView().setLoading('Loading Resources ...');
        var me = this,
            weekendDays,
            taskStore = LeankorApp.Gantt.gantt.taskStore,
            assignmentgridpanel = Ext.ComponentQuery.query('[xtype=assignmentgridpanel]')[0];
        me.objFilter = obj;
        me.objFilter.StartDate = JSON.parse(JSON.stringify(LeankorApp.Gantt.gantt.timeAxis.adjustedStart));
        me.objFilter.DueDate = JSON.parse(JSON.stringify(LeankorApp.Gantt.gantt.timeAxis.adjustedEnd));

        var partnerView = null;
        if (btype == 'ru') {
            partnerView = Ext.ComponentQuery.query('[xtype=resourceschedule]')[0];
        } else {
            partnerView = assignmentgridpanel;
        }
        partnerView.suspendRefresh();
        partnerView.suspendLayouts();
        LeankorApp.Gantt.getView() && LeankorApp.Gantt.getView().suspendLayouts();
        glueforce.getAllResources(obj, function (result) {

            var resourceStore = Ext.getStore('resourcesStoreCustom'),
                assignmenetStore = Ext.getStore('assignmentStore'),
                defaultCalendar = taskStore.getCalendar();
            portfolio.workingHoursPerDay = result.workingHoursPerDay;
            weekendDays = me.getWeekendDays();
            // var calendarSevenDays = Ext.create('Gnt.data.calendar.BusinessTime', {
            // calendarId: 'calendarSevenDays',

            // daysPerWeek: 7,
            // daysPerMonth: 30,
            // weekendFirstDay: weekendDays.first,
            // weekendSecondDay: weekendDays.second,
            // weekendsAreWorkdays: true
            // }),
            defaultCalendar.defaultAvailability = me.getCalendarAvailability(portfolio.workingHoursPerDay);
            defaultCalendar.hoursPerDay = portfolio.workingHoursPerDay;
            var calendarFivsDays = Ext.create('Gnt.data.calendar.BusinessTime', {
                calendarId: 'calendarFivsDays',
                defaultAvailability: me.getCalendarAvailability(portfolio.workingHoursPerDay),
                hoursPerDay: portfolio.workingHoursPerDay,
                daysPerWeek: 5,
                daysPerMonth: 20,
                weekendFirstDay: weekendDays.first,
                weekendSecondDay: weekendDays.second,
                weekendsAreWorkdays: false
            });

            taskStore.setCalendar(defaultCalendar, true);
            if (result.ResourceUsersData.length) {
                var resourceCalendarData = result.ResourceUsersData[0].ResourceHoursData;
                me.dorec = function (card, index) {
                    if (Array.isArray(card.children)) {
                        card.children.forEach(me.dorec);
                    }
                    card.leaf = true;
                    card.children = [];
                    card.DueDate = new Date(JSON.parse(card.DueDate));
                    card.StartDate = new Date(JSON.parse(card.StartDate));
                    card.DurationUnits = me.convertDUInGanttFormat(card.DurationUnits);
                    me.setFixedTime(card.DueDate, card.StartDate, card.DurationUnits, card.EstimatedDuration);
                    card.EffortUnit = me.convertDUInGanttFormat(card.EffortUnit);
                    if (!resourceCalendarData.length) {
                        card.CalendarId = card.SevenDayWorkWeek ? 'calendarSevenDays' : 'calendarFivsDays';
                    }
                };
                Ext.Array.forEach(result.resourceCards, me.dorec);
                if (result.resourceCards) {
                    if (taskStore.getCount()) {
                        taskStore.append(result.resourceCards);
                    } else {
                        //taskStore.proxy.data = result.resourceCards;
                        taskStore.loadData(result.resourceCards);
                    }
                    taskStore.sortByType();
                }
                if (result.resourceAssignments) {
                    assignmenetStore.add(result.resourceAssignments);
                    assignmenetStore.sortByType();
                }
                var arrayOfUserRecord = [];
                if (resourceCalendarData.length) {
                    //Put it inside loop when we have multiple calendars
                    //Override default calendar
                    var calendar = Ext.create('Gnt.data.calendar.BusinessTime', {
                        parent: 'calendarFivsDays',
                        daysPerWeek: 5,
                        daysPerMonth: 20,
                        weekendFirstDay: weekendDays.first,
                        weekendSecondDay: weekendDays.second,
                        weekendsAreWorkdays: false,
                        calendarId: 'RSCalendar' + result.ResourceUsersData[0].UserRecord.Id
                    });
                    var calendarid = LeankorApp.Gantt.overrideCalendarDays(resourceCalendarData, calendar, weekendDays);
                    Ext.Array.forEach(result.ResourceUsersData, function each(resData) {
                        resData.UserRecord.CalendarId = calendarid;
                        arrayOfUserRecord.push(resData.UserRecord);
                    });
                } else {
                    Ext.Array.forEach(result.ResourceUsersData, function each(resData) {
                        arrayOfUserRecord.push(resData.UserRecord);
                    });
                }

                arrayOfUserRecord = arrayOfUserRecord.filter(function (item, pos) { //remove duplicate
                    return arrayOfUserRecord.indexOf(item) == pos;
                });

                resourceStore.add(arrayOfUserRecord);
                LeankorApp.Gantt.getView() && LeankorApp.Gantt.getView().resumeLayouts(true);

                setTimeout(function () {
                    assignmentgridpanel.getStore().sort('Name', 'ASC');
                    LeankorApp.Gantt.getView().setLoading(false);
                }, 2000);
            } else {

                LeankorApp.Gantt.getView() && LeankorApp.Gantt.getView().resumeLayouts(true);
                LeankorApp.Gantt.getView().setLoading(false);
            }

            // LeankorApp.Gantt.gantt.refreshViews();

            partnerView.resumeLayouts();
            partnerView.resumeRefresh(true)
            // partnerView.refreshViews(true);
        });

    },
    onResoulutionFieldAfterRender: function (combo) {
        this.createCustomTooltip(combo.getEl(), combo.emptyText);
    },
    onViewAfterRender: function (combo) {
        this.createCustomTooltip(combo.getEl(), combo.emptyText);
    },

    onDepartmentAfterRender: function (combo) {
        this.createCustomTooltip(combo.getEl(), combo.emptyText);
    },
    onProjectAfterRender: function (combo) {
        this.createCustomTooltip(combo.getEl(), combo.emptyText);
    },
    createCustomTooltip: function (target, html) {
        new Ext.ToolTip({
            target: target,
            title: '',
            width: 100,
            html: Ext.htmlEncode(html),
            trackMouse: true
        });
    },

    bindResourceGridCloseToolKeys: function (popup, focusTarget) {
        var me = this,
            bindRows,
            syncRows,
            focusRow,
            getRows,
            boundStore;

        if (!popup || popup.leankorResourceGridCloseKeysBound) {
            return;
        }

        popup.leankorResourceGridCloseKeysBound = true;
        popup.leankorResourceGridCloseFocusTarget = focusTarget;
        // NOTE: close / Esc / the X tool are handled exactly like the working
        // project popup — by AccessibilityUtil.initPopupKeyboardNav (Esc and the
        // close tool both route through closeComponent -> popup.close()). This
        // method does NOT touch close handling; it only wires the grid's row
        // arrow-key navigation.

        getRows = function () {
            var view,
                rows;

            // The shared pagingStoreOwner store keeps these listeners alive after the popup
            // is destroyed; getView() throws internally once the grid is torn down, so bail.
            if (popup.destroyed) {
                return [];
            }

            view = popup.getView && popup.getView();
            if (!view || !view.el) {
                return [];
            }

            rows = view.el.select(view.itemSelector || '.x-grid-item').elements || [];
            return Ext.Array.filter(rows, function (row) {
                return row && row.offsetParent !== null;
            });
        };

        focusRow = function (row) {
            var view;

            if (popup.destroyed) {
                return false;
            }

            view = popup.getView && popup.getView();
            if (!row || !view || !view.el) {
                return false;
            }

            view.el.select('.lk-popup-row-focused').removeCls('lk-popup-row-focused');
            Ext.fly(row).addCls('lk-popup-row-focused');
            row.setAttribute('tabindex', '0');
            row.focus();
            return true;
        };

        syncRows = function () {
            var view,
                rows,
                selectionModel,
                selected,
                selectedRecord,
                selectedRow;

            if (popup.destroyed) {
                return;
            }

            view = popup.getView && popup.getView();
            rows = getRows();
            selectionModel = popup.getSelectionModel && popup.getSelectionModel();
            selected = selectionModel && selectionModel.getSelection && selectionModel.getSelection();
            selectedRecord = selected && selected[0];
            selectedRow = selectedRecord && view && view.getNode && view.getNode(selectedRecord);

            if (view && view.el && view.el.dom) {
                view.el.dom.setAttribute('tabindex', '-1');
            }

            Ext.Array.forEach(rows, function (row) {
                row.setAttribute('tabindex', '-1');
                row.setAttribute('role', 'option');
            });

            if (selectedRow && selectedRow.offsetParent !== null) {
                selectedRow.setAttribute('tabindex', '0');
            } else if (rows[0]) {
                rows[0].setAttribute('tabindex', '0');
            }
        };

        bindRows = function () {
            var view = popup.getView && popup.getView(),
                store = popup.getStore && popup.getStore();

            if (!view || !view.el || view.leankorResourceGridRowsBound) {
                syncRows();
                return;
            }

            view.leankorResourceGridRowsBound = true;
            syncRows();
            view.el.on('focus', function () {
                var rows = getRows(),
                    activeRow = view.el.down('.lk-popup-row-focused', true) || rows[0];

                Ext.defer(function () {
                    focusRow(activeRow);
                }, 1);
            });
            // Drop the row focus ring once focus leaves the list entirely (to the
            // Close (X) tool, a footer button, or the search field). The ring is a
            // JS class (.lk-popup-row-focused) that does not track real focus, so
            // without this it lingers on the last row while another control is
            // focused — the Close tool and a row would both look focused at once.
            // focusleave only fires when focus exits view.el and all its rows, so
            // Up/Down moves between rows (which stay inside view.el) are unaffected.
            view.el.on('focusleave', function () {
                if (popup.destroyed || !view.el) {
                    return;
                }
                view.el.select('.lk-popup-row-focused').removeCls('lk-popup-row-focused');
            });
            view.el.on('keydown', function (event, target) {
                var key = event.getKey && event.getKey(),
                    downKey = Ext.event.Event.DOWN || 40,
                    upKey = Ext.event.Event.UP || 38,
                    homeKey = Ext.event.Event.HOME || 36,
                    endKey = Ext.event.Event.END || 35,
                    enterKey = Ext.event.Event.ENTER || 13,
                    spaceKey = Ext.event.Event.SPACE || 32,
                    rows = getRows(),
                    targetEl = target && Ext.fly(target),
                    row = targetEl && (targetEl.is(view.itemSelector || '.x-grid-item')
                        ? target : targetEl.up(view.itemSelector || '.x-grid-item', view.el, true)),
                    index = Ext.Array.indexOf(rows, row),
                    selectionModel,
                    record;

                if (!rows.length) {
                    return true;
                }

                if (index < 0) {
                    index = 0;
                }

                if (key === downKey || key === upKey || key === homeKey || key === endKey) {
                    event.stopEvent();
                    if (key === downKey) {
                        index = Math.min(rows.length - 1, index + 1);
                    } else if (key === upKey) {
                        index = Math.max(0, index - 1);
                    } else if (key === homeKey) {
                        index = 0;
                    } else {
                        index = rows.length - 1;
                    }
                    focusRow(rows[index]);
                    return false;
                }

                if (key === enterKey || key === spaceKey) {
                    selectionModel = popup.getSelectionModel && popup.getSelectionModel();
                    record = view.getRecord && view.getRecord(row);
                    if (selectionModel && record) {
                        event.stopEvent();
                        if (selectionModel.isSelected && selectionModel.isSelected(record)) {
                            selectionModel.deselect(record);
                        } else {
                            selectionModel.select(record, true);
                        }
                        focusRow(row);
                        return false;
                    }
                }

                return true;
            });

            view.on('refresh', syncRows);
            view.on('itemadd', syncRows);
            view.on('itemupdate', syncRows);
            if (store && store.on) {
                boundStore = store;
                store.on('load', syncRows);
                store.on('datachanged', syncRows);
            }
        };

        popup.on({
            afterrender: function () {
                bindRows();
            },
            show: function () {
                bindRows();
            },
            destroy: function () {
                // pagingStoreOwner is shared and outlives the popup; drop our listeners so
                // stale syncRows closures don't fire against a destroyed grid on later loads.
                if (boundStore && boundStore.un) {
                    boundStore.un('load', syncRows);
                    boundStore.un('datachanged', syncRows);
                    boundStore = null;
                }
            },
            scope: me
        });

        if (popup.rendered) {
            bindRows();
        }
    },

    restoreResourceGridCloseFocus: function (focusTarget) {
        Ext.defer(function () {
            if (!focusTarget) {
                return;
            }

            // A combo focusTarget (e.g. the "View"/departmentFilter combo) opted into
            // the header keyboard pipeline expands its dropdown on Enter. The Enter that
            // closed this popup is still down/repeating when focus lands back on the combo,
            // so onHeaderComboSpecialKey would immediately re-open the combo's list. Set the
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

            if (focusTarget.isComponent && !focusTarget.destroyed && focusTarget.focus) {
                focusTarget.focus();
            } else if (focusTarget.focus && document.documentElement.contains(focusTarget)) {
                focusTarget.focus();
            }
        }, 50);
    },

    updatePopupOverflow: function (editor, originalHeight) {

        if (!editor || editor.destroyed)
            return;

        const viewportHeight = Ext.Element.getViewportHeight();
        const buffer = 20;

        // Store original maxHeight once
        if (!editor._originalMaxHeight) {
            editor._originalMaxHeight = editor.maxHeight || editor.height;
        }

        const newHeight = Math.min(
            editor._originalMaxHeight,
            viewportHeight - buffer);

        // Only update if meaningful change
        if (Math.abs(editor.height - newHeight) > 2) {
            editor.setHeight(newHeight);
        }
    },
});
