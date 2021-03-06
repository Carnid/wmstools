var mongoose = require('mongoose'),
	Task = mongoose.model('Task'),
	Project = mongoose.model('Project'),
	User = mongoose.model('User'),
	async = require('async'),
	_ = require('underscore');
	
// New project
exports.new = function(req, res){
	Project
		.find()
		.sort({'number': 1})
		.exec(function(err, projects) {
			User
				.find()
				.sort({'name': 1})
				.exec(function(err, users) {
					res.render('tasks/new', {
						title: 'New Task', 
						task: new Task({}),
						projects: projects,
						users : users
					});
				})
		});
}

// Create a task
exports.create = function (req, res) {
	var task = new Task(req.body);

	// Auto-update de la création
	task.created_date = new Date;
	task.created_by = req.user;
	
	Task.count().exec(function (err, count) {
  		task.number = count + 1;
  		task.save(function(err){
			if (err) {
				res.render('tasks/new', {
					title: 'New Task', 
					task: task, 
					errors: err.errors
				});
			} else {
				res.redirect('/tasks');
			}
		});
	});
}

// Edit a task
exports.edit = function (req, res) {
	Project
		.find()
		.sort({'number': 1})
		.exec(function(err, projects) {
			User
				.find()
				.sort({'name': 1})
				.exec(function(err, users) {
					res.render('tasks/edit', {
						title: 'New Task', 
						task: req.task,
						projects: projects,
						users : users
					});
				})
		});
}

// Update task
exports.update = function(req, res){
	var task = req.task

	task = _.extend(task, req.body)
	
	// Auto-update de la modification
	task.modified_date = new Date;
	task.modified_by = req.user;
	
	task.save(function(err, task) {
		if (err) {
			res.render('tasks/edit', {
 				title: 'Edit Task', 
 				task: task, 
 				errors: err.errors
			})
		} else {
			res.redirect('/tasks')
		}
	})
}

// Sauvgarder les tâches avec le quick-editing
exports.quicksave = function(req, res) {	
	var fieldname = req.body.name;

	Task.findOne({ _id: req.body.pk }, function (err, task) {
		task[fieldname] = req.body.value;
			
		task.save(function(err, task) {
			if (err) {
				res.send({success : false, msg : err.message})
			} else {
				res.send({success : true})
			}
		})
	});	
}

// View a task
exports.show = function(req, res){
	res.render('tasks/show', {
		worklogs : req.worklogs,
		task: req.task
	})
}

// Delete a task
exports.destroy = function(req, res){
	var task = req.task
	task.remove(function(err){
		res.redirect('/tasks');
	})
}


// Listing of tasks
exports.index = function(req, res){
	var perPage = 100, 
		page = req.param('page') > 0 ? req.param('page') : 0

	var project_filter = req.param('project_filter') || "";
	var user_filter = req.param('user_filter') || "";
	var filters = {};
	
	if (project_filter != "")
		filters.project = project_filter;
	
	if (user_filter != "")
		filters.assigned_to = user_filter;

	async.parallel(
		{
			projects : function(callback) {
				Project
					.find()
					.sort({'number' : 1})
					.exec(function(err, projects) {
						callback(err, projects);
					})
			},
			users : function(callback) {
				User
					.find()
					.sort({'name' : 1})
					.exec(function(err, users) {
						callback(err, users);
					})
			}
		},
		function(err, collections) {
			Task
				.find(filters)
				.populate('assigned_to')
				.populate('project')
				.populate('created_by')
				.populate('modified_by')
				.sort({'number': -1}) // sort by date
				.limit(perPage)
				.skip(perPage * page)
				.exec(function(err, tasks) {
					if (err) {
						return res.render('500')
					}
					
					tasks.forEach(function(task) {
						task.isLate = new Date() > task.due_date;
					});
					
					Task.count().exec(function (err, count) {
						res.render('tasks/index', {
							title: 'List of Tasks', 
							tasks: tasks, 
							page: page, 
							pages: count / perPage,
							count : count,
							collections : collections,
							project_filter : project_filter,
							user_filter : user_filter
						})
					});
				})
		}
	);
}
