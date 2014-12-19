$(document).ready(function(){
    $('.udfCode .viewUDF').click(function(){
        var currId = $(this).parent().parent().attr('id');
        var codeToShow = '#' + currId + ' .udfCode .code';
        $(codeToShow).slideToggle();
		//remove function from currId
		var id = currId.replace(/function/,"");
//        $(codeToShow + ' code').load( '/index.cfm?event=page.code&udfid='+id, {}, function(){});
        $(codeToShow + ' code').load( '/udf-code/'+id);
        return false;
    });

    $('.advSearch .viewAdvSearch').click(function(){
        $('.advSearchOptions').slideToggle();
        return false;
    });
});