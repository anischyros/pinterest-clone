// Handler for "Log In with Twitter" button.
$(function()
{
    $("#sign-in-with-twitter").on("click", function()
    {
        window.location.href = "/request-token";
    });

	$(".grid").masonry(
	{
		itemSelector: ".grid-item",
	});
});

function doAddPicture()
{
	var dialog = $("#add-picture-form").dialog(
	{
		width: 500,
		height: 200,
		modal: true,
		buttons:
		{
			"Add picture": onAddPictureButton,
			"Cancel": function() { dialog.dialog("close"); }
		}
	});
}

function onAddPictureButton()
{
	$.ajax("/AddPicture",
	{
		data: 
		{
			title: $("#title-field").val(),
			url: $("#url-field").val()
		},
		datatype: "json",
		success: function() { location.reload(); }
	});
}

function onRemovePictureButton(id)
{
	$.ajax("/RemovePicture",
	{
		data:
		{
			id: id
		},
		datatype: "json",
		success: function() { location.reload(); }
	});
}

function onImageError(image)
{
	image.onerror = "";
	image.src = "/noimage.png";
	return true;
}
