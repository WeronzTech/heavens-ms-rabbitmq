// import Role from "../models/role.model.js";

// export const getRoleByName = async (req, res) => {
//   try {
//     const {roleName} = req.params;

//     const role = await Role.findOne({roleName});
//     if (!role) {
//       return res.status(404).json({success: false, message: "Role not found"});
//     }

//     res.status(200).json({success: true, data: role});
//   } catch (error) {
//     res.status(500).json({success: false, message: error.message});
//   }
// };
