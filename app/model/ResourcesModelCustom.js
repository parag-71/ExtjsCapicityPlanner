/**
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: ResourcesModelCustom.js
 */
Ext.define("LeankorApp.model.ResourcesModelCustom", {
	extend: "Gnt.model.Resource",
	idProperty: 'Id',
	nameField : 'name',
	fields: [{
			name: 'Id',
			type: 'string'
		},
		/**
		 *@Modified <24-05-18> Pankaj
		 *@Description: IsActive is boolean value so change type "string" to "boolean".
		 */
		{
			name: 'IsActive',
			type: 'boolean'
		}

	],
	getProjectCalendar:function() {
	  return this.getTaskStore() ? this.getTaskStore().getCalendar() : LeankorApp.Gantt.gantt.taskStore.getCalendar();
	},
	getUtilizationInfo:function(startDate, endDate, underUtilizationThreshold, overUtilizationThreshold) {
	  var me = this, amountMs = 0, isOverallocated = false, isUnderallocated = false, assignmentInfo = {}, taskInfo = {};
	  
	  if (arguments.length < 3) {
		underUtilizationThreshold = overUtilizationThreshold = 100;
	  }
	  //overriding here // by default overUtilizationThreshold is 100 , but here , we will multiply overUtilizationThreshold value by num. of resources available in a resource type
	  if(me.data.relatedResources && me.data.relatedResources.length){
		  overUtilizationThreshold = me.data.relatedResources.length * 100;
		  underUtilizationThreshold = overUtilizationThreshold - 1;
	  }
	  else{
		  overUtilizationThreshold = underUtilizationThreshold = 0;
	  }
	  //eOf Code
	  var allocationIntervals = me.getAllocationInfo({includeResCalIntervals:true, startDate:startDate, endDate:endDate});
	  Ext.Array.each(allocationIntervals, function(intervalInfo) {
		amountMs += intervalInfo.totalAllocationMS;
		if (intervalInfo.effectiveTotalAllocation > overUtilizationThreshold) {
		  isOverallocated = true;
		  isUnderallocated = false;
		} else {
		  if (!isOverallocated && intervalInfo.effectiveTotalAllocation < underUtilizationThreshold) {
			isUnderallocated = true;
		  }
		}
		Ext.Array.each(intervalInfo.effectiveAssignments, function(assignment) {
		  var assignmentId = assignment.getId(), taskId = assignment.getTaskId(), assignmentUnits = assignment.getUnits(), allocationMs = Math.floor((intervalInfo.endDate - intervalInfo.startDate) * assignmentUnits / 100), allocationDeltaMs = 0, isOverallocated = assignmentUnits > overUtilizationThreshold, isUnderallocated = assignmentUnits < underUtilizationThreshold, assignmentUtilization;
		  if (assignmentInfo[assignmentId]) {
			assignmentUtilization = assignmentInfo[assignmentId];
			assignmentUtilization.allocationMs += allocationMs;
			assignmentUtilization.allocationDeltaMs += allocationDeltaMs;
			assignmentUtilization.isOverallocated = assignmentUtilization.isOverallocated || isOverallocated;
			assignmentUtilization.isUnderallocated = assignmentUtilization.isUnderallocated || isUnderallocated;
		  } else {
			assignmentUtilization = {isUtilized:true, allocationMs:allocationMs, allocationDeltaMs:allocationDeltaMs, isOverallocated:isOverallocated, isUnderallocated:isUnderallocated};
			assignmentInfo[assignmentId] = assignmentUtilization;
			taskInfo[taskId] = assignmentUtilization;
		  }
		});
	  });
	  return {isUtilized:amountMs > 0, allocationMs:amountMs, allocationDeltaMs:0, isOverallocated:isOverallocated, isUnderallocated:isUnderallocated, assignmentInfo:assignmentInfo, taskInfo:taskInfo};
	}
});
