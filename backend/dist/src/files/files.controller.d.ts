import { FilesService } from './files.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UploadFileDto } from './dtos/upload-file.dto';
export declare class FilesController {
    private readonly filesService;
    constructor(filesService: FilesService);
    findAll(user: AuthenticatedUser): Promise<{
        id: string;
        created_at: Date;
        tenant_id: string;
        filename: string;
        mime_type: string;
        size: number;
        storage_path: string;
    }[]>;
    findOne(id: string, user: AuthenticatedUser): Promise<{
        id: string;
        created_at: Date;
        tenant_id: string;
        filename: string;
        mime_type: string;
        size: number;
        storage_path: string;
    }>;
    upload(user: AuthenticatedUser, body: UploadFileDto): Promise<{
        id: string;
        created_at: Date;
        tenant_id: string;
        filename: string;
        mime_type: string;
        size: number;
        storage_path: string;
    }>;
    remove(id: string, user: AuthenticatedUser): Promise<{
        message: string;
    }>;
}
