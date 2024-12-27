const asyncHandler = () => {

}

export {asyncHandler}


// const asyncHandler = (fun) => {}
// const asyncHandler = (fun) => async {() => {}}

// const asyncHandler = (fun) => async (req, res) => {
//     try{
//         await fun(req, res, next);
//     }catch(error) {
//         res.status(error.code || 500).jeson({
//             success : false,
//             message : error.message,
//         })
//     }
// }