/*
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: ResourceSchedule.js
 */
Ext.define("LeankorApp.view.ResourceSchedule", {
	extend: 'Sch.panel.SchedulerGrid',
	xtype: 'resourceschedule',
	requires: [
		'LeankorApp.util.AccessibilityUtil'
	],
	flex: 1,
	rowHeight: 30,
	widht: '100%',
	height: '100%',
	//allowOverlap: true,
	itemId: 'rsPanel',
	//multiSelect : true,
	animCollapse: false,
	eventResizeHandles: 'none',
	resizable: true,
	resizeHandles: 'n',
	//body : false,
	//bodyBorder : false,
	//split : true,
	//border : true,
	showTodayLine: true,
	// highlightWeekends: true,
	cls: 'backGroudCls',
	plugins: [
		{
			ptype: 'scheduler_printable',
			pluginId: 'printPlugin',
			fakeBackgroundColor: true,
			exportDialogConfig: {
				showColumnPicker: false,
				title: Locale.LocaleName.PrintSetting,
				cls: Ext.baseCSSPrefix + 'print-field-cls'
			}

		}

	],
	// Use the same layout and appearance as the Gantt chart

	viewConfig: {
		preserveScrollOnRefresh: true
	},
	// Scheduler configs
	enableDragCreation: false,
	barMargin: 2,
	lockedGridConfig: {
		width: 200,
		region: 'west'
	},
	//eventBorderWidth  : 0,
	assignmentStore: null,
	workingTimeStore: null,
	tooltipTpl: new Ext.XTemplate('<tpl><div>{ToolTip}</div></tpl>'),
	columns: [{
			text: Locale.LocaleName.Name,
			cls: 'nameColumnCls',
			header: '<span class ="addBtnTop" name = "addButton"></span><span style = "margin-left : 10px">'+Locale.LocaleName.Name+'</span>',
			flex: 1,
			dataIndex: 'Name',
			resizable: false,
			sortable: false,
			menuDisabled: true,
			reference: 'onAddNewResources',
			// editor   : {xtype: 'textfield'}
			//31-08-2017.
			/**
			 *@History
			 *<23-05-18>      <Sheetal Modi>     <If user is inactive , change the color of text to #ddd and show '(inactive)' in postfix of tooltip. otherwise show normally.>
			 */

			renderer: function (v, meta, rec) {
				if (rec.getName()) {
					// if (!rec.get('IsActive')) {
						// meta.tdAttr = 'data-qtip="' + rec.getName() + '  (inactive)"';
						// meta.style = 'color : #dddd';
					// } else {
						meta.tdAttr = 'data-qtip="' + rec.getName() + '"';
					// }
					return Ext.htmlEncode(rec.getName());
				}
			}
		}
	],
	// Helps scheduler out with milestone and split task rendering
	/**@Modified <24-05-18> Pankaj
	 * @Description: Show link icon in UI and on hover show link project name and also remove unnecessary line of code.
	 */
	eventRenderer: function (eventRecord, resourceRecord, tplData, row, col, ds) {
		_LOG && console.log('eventRenderer of RS');
		var tempName = eventRecord.getAssignmentFor(resourceRecord),
		iconvalue = '',
		projectName = '',
		customName;
		if (tempName) {
			customName = tempName.get('CustomTaskName');
			if (tempName.get('isLinked')) {
				iconvalue = '<div role="presentation" class=" x-tree-icon  x-tree-icon-leaf linkIcon linkIcon_Resourcesche"></div> ';
				projectName = ' ('+Locale.LocaleName.LinkedToProject+' ' + tempName.get('parentProjectRoomName') + ')';
			}
			var schStartDate,
			newInstResetTimeDueDate,
			newInstResetStartDate,
			newInstResetFSLDueDate,
			newInstResetFSLStartDate,
			schEndDate;
			if (tempName.get('Type') == 'FSL') {
				/** @Date 15-Mar-2019 now we are changing activity  dates are gettting inside  @param [fslSchedDueDateTime, fslSchedStartDateTime ]*/

				// Compare date if fsl belong to startdate or enddate of card
				newInstResetFSLDueDate = eventRecord.get('fslSchedDueDateTime') && Ext.Date.clearTime(new Date(eventRecord.get('fslSchedDueDateTime')), true);
				newInstResetFSLStartDate = eventRecord.get('fslSchedStartDateTime') && Ext.Date.clearTime(new Date(eventRecord.get('fslSchedStartDateTime')), true);
				newInstResetTimeDueDate = Ext.Date.clearTime(eventRecord.get('DueDate'), true);
				newInstResetStartDate = Ext.Date.clearTime(eventRecord.get('StartDate'), true);
				if (eventRecord.get('fslSchedStartDateTime')) {
					// schStartDate = Ext.Date.between(newInstResetFSLStartDate, newInstResetStartDate, newInstResetTimeDueDate);
					schStartDate = Ext.Date.between(newInstResetStartDate, newInstResetFSLStartDate, newInstResetFSLDueDate);
				}
				//maxDueDate: 1549018280000
				//minStartDate: 1543056818000
				if (eventRecord.get('fslSchedDueDateTime')) {
					// schEndDate = Ext.Date.between(newInstResetFSLDueDate, newInstResetStartDate, newInstResetTimeDueDate);
					schEndDate = Ext.Date.between(newInstResetTimeDueDate, newInstResetFSLStartDate, newInstResetFSLDueDate);
				}

				if (schStartDate && schEndDate) {
					// blue border   FFC200
					tplData.style = 'background-color: #000080 ; color : white; border-radius: 1px;';
				} else {
					tplData.style = 'background-color: #000080 ; border: 2px solid #FFC200; color : white; border-radius: 1px;';

				} // 2px solid #FFC201;


			} else if (eventRecord.get('maxDueDate') || eventRecord.get('minStartDate')) {
				// Compare date if fsl belong to startdate or enddate of card
				newInstResetFSLDueDate = eventRecord.get('maxDueDate') && Ext.Date.clearTime(new Date(eventRecord.get('maxDueDate')), true);
				newInstResetFSLStartDate = eventRecord.get('minStartDate') && Ext.Date.clearTime(new Date(eventRecord.get('minStartDate')), true);
				newInstResetTimeDueDate = Ext.Date.clearTime(eventRecord.get('DueDate'), true);
				newInstResetStartDate = Ext.Date.clearTime(eventRecord.get('StartDate'), true);
				if (eventRecord.get('minStartDate')) {
					schStartDate = Ext.Date.between(newInstResetFSLStartDate, newInstResetStartDate, newInstResetTimeDueDate);
				}
				if (eventRecord.get('maxDueDate')) {
					schEndDate = Ext.Date.between(newInstResetFSLDueDate, newInstResetStartDate, newInstResetTimeDueDate);
				}

				if (schStartDate && schEndDate) {
					tplData.style = 'background-color: #2563EB ; color : white; border-radius: 1px;';
				} else {
					tplData.style = 'background-color: #2563EB ; border: 2px solid #FFC200; color : white; border-radius: 1px;';

				} // 2px solid #FFC201;
			} else {
				tplData.style = 'background-color: #2563EB ; color : white; border-radius: 1px;border-color: rgb(71, 151, 231) !important;';
			}
			if (customName) {
				eventRecord.set('ToolTip', customName + '' + projectName);
				eventRecord.set('Type', tempName.get('Type'));
				return iconvalue + '' + tempName.get('CustomTaskName');
			}
		}
		//eventRecord.set('ToolTip', eventRecord.getName());
		return Ext.htmlEncode(eventRecord.getName());

	},
	listeners: {
		eventcontextmenu: function (scheduler, eventRecord, e, eOpts) {
			_LOG && console.log('eventcontextmenu of RS');
			e.stopEvent(); // Stop browsers
			LeankorApp.util.AccessibilityUtil.announce(Locale.LocaleName.ContextMenuOpened);
			var SchMenu = Ext.create('Ext.menu.Menu', {
					width: 60,
					floating: true, // usually you want this set to True (default)
					plain: true,
					items: [{
							text: Locale.LocaleName.Discuss,
							handler: function () {
								_LOG && console.log('discussOnChatter');
								var url = (portfolio.BaseURL) + portfolio.KanbanCardChatterFeedURL.replace("/", "");
								var myURL = url + '?Id=' + Ext.htmlEncode(eventRecord.data.ForceID);

								var oDialog = new Ext.Window({
										title: Ext.htmlEncode(eventRecord.data.Name),
										width: '70%',
										height: '70%',
										closable: true,
										resizable: true,
										draggable: true,
										modal: true,
										border: true,
										top: 10,
										tools: [{
												xtype: 'button',
												iconCls: 'chatterButtonCls',
												cls: 'toolbar-custom-btn',
												tooltip: Ext.htmlEncode(Locale.LocaleName.FollowOnChatter || Locale.LocaleName.Discuss),
												ariaLabel: Ext.htmlEncode(Locale.LocaleName.FollowOnChatter || Locale.LocaleName.Discuss),
												listeners: {
													click: function (me, e, eOpts) {
														var isLightningUrl = Ext.urlDecode(decodeURIComponent(window.location.search.substring(1)));
														if (isLightningUrl.isLightning) {
															myURL = myURL + '&isLightning=true';
															window.open(LeankorApp.Gantt.sanitizeValue(myURL));
															myURL = url + '?Id=' + Ext.htmlEncode(eventRecord.data.ForceID);
														} else {
															window.open(LeankorApp.Gantt.sanitizeValue(myURL));
														}
													}
												}
											}
										],
										itemId: 'myChaterWindow',
										html: ['<iframe height="100%" width=100% src="' + myURL + '"></iframe>']
									});
								oDialog.show();
							}
						}, {

							text: Locale.LocaleName.OpenBoard,
							handler: function () {
								_LOG && console.log('right click Open Board option of RS');
								var myBoardType = eventRecord.data.BoardType,
								vsStore,
								fId,
								vsRecord,
								kanbanUrl = (portfolio.BaseURL);
								switch (myBoardType) {
								case "Kanban Board":
								case "Plan Board":
									kanbanUrl += (portfolio.KanbanBoardURL).replace('/', '') + '?Id=';
									break;
								case "Whiteboard":
								case "DashBoard":
									kanbanUrl += (portfolio.VisualKanbanURL).replace('/', '') + '?Id=';
									break;
								case "Portfolio View":
									kanbanUrl += (portfolio.PortfolioViewURL).replace('/', '') + '?Id=';
									break;
								case "UberBoard":
									vsStore = Ext.getStore('vsStore');
									vsRecord = vsStore.findRecord('Id', eventRecord.data.ValueStreamID);
									if (vsRecord) {
										fId = vsRecord.data.leankor__ProjectRoom__c;
									}
									kanbanUrl += (portfolio.pageGanttView).replace('/', '') + '?fid=' + Ext.htmlEncode(fId) + '&btype=projectgantt&Id=';
									break;
								default:
									kanbanUrl += (portfolio.VisualKanbanURL).replace('/', '') + '?Id=';
									break;
								}
								var myURL = kanbanUrl + Ext.htmlEncode(eventRecord.data.ValueStreamID) + '&cardid=' + Ext.htmlEncode(eventRecord.data.ForceID);
								window.open(LeankorApp.Gantt.sanitizeValue(myURL));
							}

						}
					]

				});

			// Keyboard-triggered (Shift+F10 / ContextMenu / Enter on a focused
			// event): anchor the menu to the event bar and move focus to the
			// first item so it is keyboard-navigable. Mouse right-click keeps
			// the pointer-position behaviour. Mirrors resource-management.
			if (e && e.keyboardOpen && e.targetEl) {
				SchMenu.showBy(Ext.get(e.targetEl), 'tl-bl');
				Ext.defer(function () {
					var first = SchMenu.down('menuitem');
					if (first && typeof first.focus === 'function') {
						first.focus();
					}
				}, 50);
			} else {
				SchMenu.showAt(e.getXY());
			}
		},
		eventdragstart: function (view, dragContext, eOpts) {
			Ext.getStore('assignmentStore').commitChanges();
		},
		afterRender: function () {
			if (btype == 'ru') {
				this.getColumns()[0].setText('');
				this.getColumns()[0].initialConfig.header = '';
				this.getColumns()[0].initialConfig.text = '';
			}
			LeankorApp.util.AccessibilityUtil.enableBoardFocus(this);

		},
		/**@author Bhupendra
		 * @Description: Don't allow to move FSL (Field Service Lightning) cards.
		 * @event {beforeeventdrag} firing by Sch.panel.SchedulerGrid.
		 * @param The scheduler view {Sch.view.SchedulerGridView}											scheduler
		 * @param The record corresponding to the node that's about to be dragged {Sch.model.Event}			record
		 * @param The event object {Ext.event.Event}															e
		 */
		beforeeventdrag: function (scheduler, record, e) {
			if (record.get('Type') === 'FSL' || !record.get('hasEditAccess')) {
				LeankorApp.util.AccessibilityUtil.announceError(
					record.get('Type') === 'FSL'
						? Locale.LocaleName.FslCannotMove
						: Locale.LocaleName.MoveActivityToInactiveUserError
				);
				return false;
			}
		},

		/**
		 *@method aftereventdrop
		 *@param gantt gantt view
		 *@param eOpts option list
		 *@Description method is used to save changes RA in db by calling method - CreateAndDeleteResourceAssignment and then delete newly created RA record and insert data came from db to avoid Id conflict
		 *@History
		 *<22-05-18>      <Sheetal Modi>     <Preventing an inactive user to be assigned and showing popup message if trying to do so.>
		 */
		beforeeventdropfinalize: function (dragZone, dragContext, e, eOpts) {
			LeankorApp.Gantt.getView().setLoading(Ext.htmlEncode(Locale.LocaleName.PleaseWait)+'....');
			var deleteIdList = [],
			deleteList = [],
			tempArry = [],
			mainObj = {},
			i = 0,
			store = Ext.getStore('assignmentStore');

			//change code when support multiselect
			dragContext.endDate = dragContext.origEnd;
			dragContext.startDate = dragContext.origStart;
			//eof code
			for (i; i < dragContext.draggedRecords.length; i++) {
				if (dragContext.newResource.data.Id != dragContext.resourceRecord.data.Id) {
					var temp = dragContext.draggedRecords[i].data;

					var flag = true; // flag to check if card is dropped in new resoirce or not. If true , its for different user.
					store.each(function (record) {
						if (record.data.TaskId == temp.TaskId && record.data.ResourceId == dragContext.newResource.data.Id) { //Prevent allocation of same card to already assigned resource
							flag = false;
						}
					});

					if (flag) {

						//27-05-18
						//If new resource is iactive , prevent it to be assigned and show a popup message
						if (!dragContext.newResource.get('IsActive')) {
							LeankorApp.Gantt.getView().setLoading(false);
							dragContext.draggedRecords[i].reject();
							// showing Message Can not assign Inactive user.
							LeankorApp.util.AccessibilityUtil.announceError(Locale.LocaleName.AssignInactiveUserError);
							LeankorApp.Gantt.alertMsgBox(Locale.LocaleName.AssignInactiveUserError);
							dragContext.finalize(false);
							return false;
						}
						//eOf code  , following with else
						else {
							var deleteObj = {},
							cardRecord = LeankorApp.Gantt.gantt.taskStore.findRecord('Id', temp.TaskId);
							if (dragContext.draggedRecords[i].get('Type') == 'FSL') {
								continue;
							}
							deleteIdList.push(dragContext.draggedRecords[i].data.Id);
							deleteObj.ResourceId = dragContext.newResource.data.Id;
							deleteObj.TaskId = temp.TaskId;
							deleteObj.Units = temp.Units;
							deleteObj.PercentDone = cardRecord && cardRecord.data.PercentDone;
							deleteList.push(deleteObj);
							if (dragContext.timeDiff > 86400000 || dragContext.timeDiff < -86400000) {

								// showing Message can not move activity on different date for same user.
								LeankorApp.util.AccessibilityUtil.announceError(Locale.LocaleName.MoveActivityToInactiveUserError);
								LeankorApp.Gantt.alertMsgBox(Locale.LocaleName.MoveActivityToInactiveUserError);
							}
						}

					} else {
						dragContext.draggedRecords[i].reject();
						// showing Message resource is already assigned.
						LeankorApp.util.AccessibilityUtil.announceError(Locale.LocaleName.AlreadyAssignedToCardMsg);
						LeankorApp.Gantt.alertMsgBox(Locale.LocaleName.AlreadyAssignedToCardMsg);
					}
				} else {
					// showing Message can not move activity on different date for same user.
					if (dragContext.timeDiff > 86400000 || dragContext.timeDiff < -86400000) {

						LeankorApp.util.AccessibilityUtil.announceError(Locale.LocaleName.MoveActivityToInactiveUserError);
						LeankorApp.Gantt.alertMsgBox(Locale.LocaleName.MoveActivityToInactiveUserError);
					}
				} //eof code
			}
			if (deleteIdList.length) {
				mainObj.deleteId = deleteIdList;
				mainObj.newData = deleteList;

				glueforce.CreateAndDeleteResourceAssignment(mainObj, function (result) {
					store.each(function (record) {
						if (record.data.Id.startsWith('LeankorApp')) {
							tempArry.push(record);
						}
					});
					store.remove(tempArry);
					store.add(result);
					store.sync();
					LeankorApp.Gantt.getView().setLoading(false);
				});
			} else {
				LeankorApp.Gantt.getView().setLoading(false);
			}

		},
		/**
		 *@add  <01-06-18> Pankaj
		 *@method aftereventdrop
		 *@Description method is used to sorting assignmentPanel when drag and drop any task
		 */
		aftereventdrop: function (scheduler, eventRecords) {
			var assignmentPanel = Ext.ComponentQuery.query('[xtype=assignmentgridpanel]')[0];
			Ext.defer(function () {
				assignmentPanel && assignmentPanel.getStore().sort('Name', 'ASC');
			}, 500);

			var rec = eventRecords && eventRecords[0];
			if (rec && rec.getStartDate) {
				var dateStr = Ext.Date.format(rec.getStartDate(), 'D M j, Y g:i A');
				LeankorApp.util.AccessibilityUtil.announce(
					Ext.String.format(Locale.LocaleName.EventMoved, dateStr)
				);
			}
		}
	}
});
