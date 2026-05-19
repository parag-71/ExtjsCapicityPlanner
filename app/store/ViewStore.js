/*
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: ViewStore.js
 */
Ext.define('LeankorApp.store.ViewStore', {
	extend : 'Ext.data.Store',
	fields : ['name', 'value'],
	storeId : 'viewStore'
});
