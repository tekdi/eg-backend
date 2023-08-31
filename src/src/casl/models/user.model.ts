import ProgramBeneficiary from './programBeneficiary.model';
import ProgramFacilitator from './programFacilitator.model';
import Role from '../enums/roles';

export default class User {
	id: number;
	programBeneficiary: ProgramBeneficiary;
	programFacilitator: ProgramFacilitator;
	roles: `${Role}`[]
}
